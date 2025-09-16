// controller/predictionController.js
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

class PredictionController {
    constructor() {
        this.modelPath = path.join(__dirname, '../model/ml_models/trained');
        this.pythonPath = path.join(__dirname, '../model/ml_models/training/venv/Scripts/python.exe');
        this.scriptPath = path.join(__dirname, '../model/ml_models/inference');
    }

    async predictAccidentRisk(req, res) {
        try {
            const inputData = req.body;
            
            // Validate input data
            const validation = await this.validateInput(inputData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid input data',
                    details: validation.errors,
                    timestamp: new Date().toISOString()
                });
            }

            // Check if models are available
            if (!await this.checkModelsAvailable()) {
                return res.status(503).json({
                    success: false,
                    error: 'Models not available. Please train models first.',
                    timestamp: new Date().toISOString()
                });
            }

            // Run Python prediction script
            const options = {
                mode: 'json',
                pythonPath: this.pythonPath,
                scriptPath: this.scriptPath,
                args: ['--input', JSON.stringify(inputData), '--model_path', this.modelPath]
            };

            const results = await PythonShell.run('predictor.py', options);
            
            if (results && results.length > 0) {
                const predictionResult = results[0];
                
                res.json({
                    success: true,
                    data: {
                        prediction: predictionResult.prediction,
                        risk_assessment: predictionResult.risk_assessment,
                        model_info: predictionResult.model_info
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                throw new Error('No prediction results returned');
            }

        } catch (error) {
            console.error('Prediction error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async predictBatch(req, res) {
        try {
            const { records } = req.body;
            
            if (!Array.isArray(records) || records.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid input: records must be a non-empty array',
                    timestamp: new Date().toISOString()
                });
            }

            // Validate all records
            const validationResults = [];
            for (let i = 0; i < records.length; i++) {
                const validation = await this.validateInput(records[i]);
                validationResults.push({
                    index: i,
                    record_id: records[i].accident_id || `record_${i}`,
                    ...validation
                });
            }

            const validRecords = records.filter((_, index) => validationResults[index].isValid);
            
            if (validRecords.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid records found',
                    validation_results: validationResults,
                    timestamp: new Date().toISOString()
                });
            }

            // Check if models are available
            if (!await this.checkModelsAvailable()) {
                return res.status(503).json({
                    success: false,
                    error: 'Models not available. Please train models first.',
                    timestamp: new Date().toISOString()
                });
            }

            // Run batch prediction
            const options = {
                mode: 'json',
                pythonPath: this.pythonPath,
                scriptPath: this.scriptPath,
                args: ['--batch', JSON.stringify(validRecords), '--model_path', this.modelPath]
            };

            const results = await PythonShell.run('predictor.py', options);
            
            res.json({
                success: true,
                data: {
                    total_records: records.length,
                    valid_records: validRecords.length,
                    invalid_records: records.length - validRecords.length,
                    predictions: results[0] || [],
                    validation_results: validationResults
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Batch prediction error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getModelInfo(req, res) {
        try {
            const metadataPath = path.join(this.modelPath, 'model_metadata.json');
            
            if (!fs.existsSync(metadataPath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Model metadata not found',
                    timestamp: new Date().toISOString()
                });
            }

            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            
            res.json({
                success: true,
                data: {
                    model_info: metadata,
                    model_available: await this.checkModelsAvailable()
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Model info error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async validateInput(data) {
        try {
            const options = {
                mode: 'json',
                pythonPath: this.pythonPath,
                scriptPath: this.scriptPath,
                args: ['--validate', JSON.stringify(data)]
            };

            const results = await PythonShell.run('validator.py', options);
            return results[0] || { isValid: false, errors: ['Validation failed'] };

        } catch (error) {
            console.error('Validation error:', error);
            return {
                isValid: false,
                errors: ['Validation service unavailable']
            };
        }
    }

    async checkModelsAvailable() {
        try {
            const requiredFiles = [
                'accident_rf_model.pkl',
                'accident_rule_system.pkl',
                'feature_encoders.pkl',
                'scaler.pkl',
                'feature_columns.pkl',
                'model_metadata.json'
            ];

            for (const file of requiredFiles) {
                const filePath = path.join(this.modelPath, file);
                if (!fs.existsSync(filePath)) {
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('Model availability check error:', error);
            return false;
        }
    }

    async trainModels(req, res) {
        try {
            // Check if training is already in progress
            const trainingLockFile = path.join(__dirname, '../logs/training.lock');
            if (fs.existsSync(trainingLockFile)) {
                return res.status(409).json({
                    success: false,
                    error: 'Training already in progress',
                    timestamp: new Date().toISOString()
                });
            }

            // Create training lock file
            fs.writeFileSync(trainingLockFile, new Date().toISOString());

            // Run training script
            const options = {
                mode: 'text',
                pythonPath: this.pythonPath,
                scriptPath: path.join(__dirname, '../model/ml_models/training'),
                args: []
            };

            const results = await PythonShell.run('train_models.py', options);
            
            // Remove training lock file
            if (fs.existsSync(trainingLockFile)) {
                fs.unlinkSync(trainingLockFile);
            }

            res.json({
                success: true,
                message: 'Model training completed',
                logs: results,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            // Remove training lock file on error
            const trainingLockFile = path.join(__dirname, '../logs/training.lock');
            if (fs.existsSync(trainingLockFile)) {
                fs.unlinkSync(trainingLockFile);
            }

            console.error('Training error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new PredictionController();