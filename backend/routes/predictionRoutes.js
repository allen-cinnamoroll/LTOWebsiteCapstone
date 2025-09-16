// routes/predictionRoutes.js
const express = require('express');
const router = express.Router();
const predictionController = require('../controller/predictionController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all prediction routes
router.use(authMiddleware);

// Single prediction endpoint
router.post('/predict', predictionController.predictAccidentRisk);

// Batch prediction endpoint
router.post('/predict/batch', predictionController.predictBatch);

// Get model information
router.get('/model/info', predictionController.getModelInfo);

// Train models endpoint (admin only)
router.post('/model/train', predictionController.trainModels);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Prediction service is healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
