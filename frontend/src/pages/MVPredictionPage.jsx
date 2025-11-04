import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

// Get Flask API URL from environment variable or use default
const MV_PREDICTION_API_BASE = import.meta.env.VITE_MV_PREDICTION_API_URL || 'http://72.60.198.244:5001';

export default function MVPredictionPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retrainStatus, setRetrainStatus] = useState(null); // 'idle', 'uploading', 'training', 'success', 'error'
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setRetrainStatus(null);
    } else {
      toast.error('Invalid file type', {
        description: 'Please upload a CSV file'
      });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setRetrainStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetrain = async () => {
    if (!selectedFile) {
      toast.error('No file selected', {
        description: 'Please select a CSV file to upload'
      });
      return;
    }

    setIsUploading(true);
    setRetrainStatus('uploading');
    setUploadProgress(0);

    try {
      // Step 1: Upload CSV file to the training directory
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 200);

      let uploadResponse;
      try {
        // Create timeout controller for browser compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        uploadResponse = await fetch(`${MV_PREDICTION_API_BASE}/api/upload-csv`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearInterval(uploadInterval);
        setUploadProgress(0);
        
        if (fetchError.name === 'AbortError' || fetchError.name === 'TypeError') {
          throw new Error(
            `Cannot connect to prediction API server. Please ensure the Flask API is running on ${MV_PREDICTION_API_BASE}. ` +
            `Check if the server is accessible and port 5001 is open.`
          );
        }
        throw fetchError;
      }

      clearInterval(uploadInterval);
      setUploadProgress(100);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload file');
      }

      // Step 2: Retrain the model
      setRetrainStatus('training');
      setUploadProgress(0);
      
      let retrainResponse;
      try {
        // Create timeout controller for browser compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for training
        
        retrainResponse = await fetch(`${MV_PREDICTION_API_BASE}/api/model/retrain`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ force: true }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
      } catch (fetchError) {
        if (fetchError.name === 'AbortError' || fetchError.name === 'TypeError') {
          throw new Error(
            `Cannot connect to prediction API server for retraining. Please ensure the Flask API is running on ${MV_PREDICTION_API_BASE}.`
          );
        }
        throw fetchError;
      }

      const retrainData = await retrainResponse.json();

      if (!retrainResponse.ok || !retrainData.success) {
        throw new Error(retrainData.error || retrainData.message || 'Failed to retrain model');
      }

      setRetrainStatus('success');
      setUploadProgress(100);
      
      toast.success('Model retrained successfully', {
        description: 'The prediction model has been updated with new data'
      });

      // Reset after success
      setTimeout(() => {
        setSelectedFile(null);
        setRetrainStatus(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('Retrain error:', error);
      setRetrainStatus('error');
      setUploadProgress(0);
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'An error occurred during the retraining process';
      
      if (error.message?.includes('Cannot connect')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION')) {
        errorMessage = `Cannot connect to the prediction API server at ${MV_PREDICTION_API_BASE}. ` +
          `Please ensure the Flask API is running. Check the server status or contact your administrator.`;
      }
      
      toast.error('Failed to retrain model', {
        description: errorMessage,
        duration: 10000, // Show longer for connection errors
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="h-full bg-white dark:bg-black overflow-y-auto">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              MV Prediction Model
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Upload new CSV data to retrain the prediction model
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <Card className="border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl">Retrain Model</CardTitle>
          <CardDescription>
            Upload a CSV file containing vehicle registration data. The system will automatically combine it with existing data and retrain the model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
              }
              ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
            `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />

            {!selectedFile ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    ${isDragging 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : 'bg-gray-100 dark:bg-gray-800'
                    }
                  `}>
                    <Upload className={`
                      w-8 h-8
                      ${isDragging 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400 dark:text-gray-500'
                      }
                    `} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    CSV files only
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <File className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {(isUploading || retrainStatus) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {retrainStatus === 'uploading' && 'Uploading file...'}
                  {retrainStatus === 'training' && 'Training model...'}
                  {retrainStatus === 'success' && 'Complete!'}
                  {retrainStatus === 'error' && 'Error occurred'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {uploadProgress}%
                </span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Status Messages */}
          {retrainStatus === 'success' && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Model retrained successfully!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  The prediction model has been updated with the new data.
                </p>
              </div>
            </div>
          )}

          {retrainStatus === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Retraining failed
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Please check the file format and try again.
                </p>
              </div>
            </div>
          )}

          {/* Retrain Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleRetrain}
              disabled={!selectedFile || isUploading}
              className="min-w-[140px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Retrain Model
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 border border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>The system automatically combines all CSV files in the training directory</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Duplicate registrations (same plateNo + dateOfRenewal) are automatically removed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>CSV files must have the same column structure as existing data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Model retraining may take several minutes depending on data size</span>
            </li>
          </ul>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

