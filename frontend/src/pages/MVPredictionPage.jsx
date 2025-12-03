import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2, TrendingUp, Info, BarChart3, HelpCircle, Calendar, ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Get Flask API URL from environment variable or use relative path in production
// In production, use relative path through nginx proxy (same origin = no CORS issues)
// In development, use explicit localhost URL or env variable
const getMVPredictionAPIBase = () => {
  // If environment variable is explicitly set, use it (highest priority)
  if (import.meta.env.VITE_MV_PREDICTION_API_URL) {
    return import.meta.env.VITE_MV_PREDICTION_API_URL;
  }
  
  // In development mode, use localhost
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:5002';
  }
  
  // In production, use relative path through nginx proxy
  // This avoids CORS issues and works with the nginx reverse proxy
  return '/mv-prediction-api';
};

const MV_PREDICTION_API_BASE = getMVPredictionAPIBase();

export default function MVPredictionPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retrainStatus, setRetrainStatus] = useState(null); // 'idle', 'uploading', 'training', 'success', 'error'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [trainingData, setTrainingData] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [hasNewFile, setHasNewFile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0); // 0 for accuracy, 1 for diagnostics
  const [dateRange, setDateRange] = useState(null); // { startDate, endDate } from CSV
  const [isAnalyzingDateRange, setIsAnalyzingDateRange] = useState(false);
  const fileInputRef = useRef(null);

  // Helper function to parse CSV row handling quoted fields
  const parseCSVRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  // Function to parse CSV and extract date range from dateOfRenewal column
  const analyzeCSVDateRange = async (file) => {
    setIsAnalyzingDateRange(true);
    setDateRange(null);
    
    try {
      const text = await file.text();
      // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length === 0) {
        return;
      }
      
      // Parse header row to find dateOfRenewal column index
      const header = parseCSVRow(lines[0]).map(col => col.replace(/^"|"$/g, ''));
      const dateColumnIndex = header.findIndex(col => col.toLowerCase() === 'dateofrenewal');
      
      if (dateColumnIndex === -1) {
        // Column not found, silently return (date range won't be shown)
        setIsAnalyzingDateRange(false);
        return;
      }
      
      // Parse dates from data rows
      const dates = [];
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]).map(cell => cell.replace(/^"|"$/g, ''));
        if (row[dateColumnIndex]) {
          const dateStr = row[dateColumnIndex].trim();
          if (dateStr) {
            // Try to parse date in MM/DD/YYYY format
            const dateParts = dateStr.split('/');
            if (dateParts.length === 3) {
              const month = parseInt(dateParts[0], 10);
              const day = parseInt(dateParts[1], 10);
              const year = parseInt(dateParts[2], 10);
              
              if (!isNaN(month) && !isNaN(day) && !isNaN(year) && 
                  month >= 1 && month <= 12 && 
                  day >= 1 && day <= 31 && 
                  year >= 1900 && year <= 2100) {
                const date = new Date(year, month - 1, day);
                // Validate the date is correct (catches invalid dates like 02/30/2025)
                if (!isNaN(date.getTime()) && 
                    date.getMonth() === month - 1 && 
                    date.getDate() === day) {
                  dates.push(date);
                }
              }
            }
          }
        }
      }
      
      if (dates.length > 0) {
        // Find min and max dates
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        // Format as "Month Day, Year" (e.g., "January 2, 2025")
        const formatDate = (date) => {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const month = monthNames[date.getMonth()];
          const day = date.getDate();
          const year = date.getFullYear();
          return `${month} ${day}, ${year}`;
        };
        
        setDateRange({
          startDate: formatDate(minDate),
          endDate: formatDate(maxDate)
        });
      }
    } catch (error) {
      console.error('Error analyzing CSV date range:', error);
      // Silently fail - don't show error to user, just don't show date range
    } finally {
      setIsAnalyzingDateRange(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setRetrainStatus(null);
      // Analyze CSV for date range
      await analyzeCSVDateRange(file);
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

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleFileInputChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setRetrainStatus(null);
    setDateRange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetrain = async () => {
    setIsUploading(true);
    setRetrainStatus('uploading');
    setUploadProgress(0);

    try {
      // Track if a new file is being uploaded
      const fileWasUploaded = !!selectedFile;
      setHasNewFile(fileWasUploaded);
      // Step 1: Upload CSV file if one is selected (optional)
      if (selectedFile) {
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
              `Check if the server is accessible and port 5002 is open.`
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
      } else {
        // No file selected, skip upload and go straight to retraining
        setUploadProgress(100);
      }

      // Step 2: Retrain the model
      setRetrainStatus('training');
      setUploadProgress(0);
      
      // Simulate training progress while waiting for the API response
      const trainingInterval = setInterval(() => {
        setUploadProgress((prev) => {
          // Slowly move towards 90% while training
          if (prev < 90) return prev + 5;
          return prev;
        });
      }, 800);
      
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
        clearInterval(trainingInterval);
        if (fetchError.name === 'AbortError' || fetchError.name === 'TypeError') {
          throw new Error(
            `Cannot connect to prediction API server for retraining. Please ensure the Flask API is running on ${MV_PREDICTION_API_BASE}.`
          );
        }
        throw fetchError;
      }

      const retrainData = await retrainResponse.json();

      if (!retrainResponse.ok || !retrainData.success) {
        clearInterval(trainingInterval);
        const error = new Error(retrainData.error || retrainData.message || 'Failed to retrain model');
        error.isFormatError = retrainData.error?.includes('missing required columns') || 
                             retrainData.error?.includes('CSV file is missing') ||
                             retrainData.error?.includes('required columns') ||
                             retrainData.error?.includes('No data found for Davao Oriental');
        throw error;
      }

      setRetrainStatus('success');
      clearInterval(trainingInterval);
      setUploadProgress(100);
      
      // Extract training data and duplicate info (if any)
      const aggregatedData = retrainData.data?.aggregated;
      if (aggregatedData) {
        setTrainingData(aggregatedData);
        const processingInfo = aggregatedData.processing_info;
        if (processingInfo && processingInfo.duplicates_removed > 0) {
          setDuplicateInfo(processingInfo);
          setShowDuplicateModal(true);
        }

        // Show success modal with high-level training info
        setShowSuccessModal(true);
      }
      
      const successMessage = fileWasUploaded 
        ? 'The prediction model has been updated with new data'
        : 'The prediction model has been retrained using existing data';
      
      toast.success('Model retrained successfully', {
        description: successMessage
      });

      // Reset after success (but keep modals open)
      setTimeout(() => {
        setSelectedFile(null);
        setRetrainStatus(null);
        setUploadProgress(0);
        setDateRange(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('Retrain error:', error);
      setRetrainStatus('error');
      setUploadProgress(0);
      
      // Get error message
      let errorMessage = error.message || 'An error occurred during the retraining process';
      
      // Check if it's a CSV format error (either from error.isFormatError flag or message content)
      const isFormatError = error.isFormatError || 
                           errorMessage.includes('missing required columns') || 
                           errorMessage.includes('CSV file is missing') ||
                           errorMessage.includes('required columns') ||
                           errorMessage.includes('No data found for Davao Oriental');
      
      if (isFormatError) {
        // Show error modal for format errors
        setErrorDetails({
          title: 'CSV Format Error',
          message: errorMessage,
          type: 'format'
        });
        setShowErrorModal(true);
      } else {
        // Show toast for other errors (connection, etc.)
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
      }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="h-full bg-gradient-to-b from-slate-50 to-white dark:from-black dark:to-gray-900 overflow-y-auto rounded-lg">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 rounded-full bg-white text-gray-800 border-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:bg-transparent dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-900/60"
        >
          <Link to="/trained-models/vehicle">
            <ArrowLeft className="h-4 w-4" />
            Back to Vehicle Model
          </Link>
        </Button>
      </div>

      {/* Main Card */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-xl">Retrain Model</CardTitle>
          <CardDescription>
            Upload a CSV file (optional) to add new data, or retrain with existing CSV files in the training directory. The system will automatically combine all CSV files and retrain the model.
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

          {/* Date Range Display */}
          {selectedFile && (
            <div className="flex items-center justify-center">
              {isAnalyzingDateRange ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing file date range...</span>
                </div>
              ) : dateRange ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">File contains data from: </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {dateRange.startDate} to {dateRange.endDate}
                  </span>
                </div>
              ) : null}
            </div>
          )}

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
              disabled={isUploading}
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
          
          {!selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                No file selected. Clicking "Retrain Model" will retrain using all existing CSV files in the training directory.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

       {/* CSV Format Requirements Card */}
       <Card className="mt-6 border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-black">
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <File className="w-5 h-5 text-blue-600 dark:text-blue-400" />
             CSV File Format Requirements
           </CardTitle>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Required Columns:</p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">fileNo</span>
                    <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">dateOfRenewal</span>
                    <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">address_municipality</span>
                    <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">plateNo</span>
                    <span className="text-xs text-orange-600 dark:text-orange-400">(optional, fallback)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">ownerName</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(optional)</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Date Format:</p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  <strong>dateOfRenewal:</strong> MM/DD/YYYY (e.g., 02/15/2025)
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Municipality Filter:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only data from Davao Oriental municipalities will be processed. The system automatically filters for:
              </p>
              <div className="mt-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  BAGANGA, BANAYBANAY, BOSTON, CARAGA, CATEEL, GOVERNOR GENEROSO, LUPON, MANAY, SAN ISIDRO, TARRAGONA, CITY OF MATI
                </p>
              </div>
            </div>
          </div>
         </CardContent>
       </Card>

       {/* Important Notes Card */}
       <Card className="mt-6 border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-black">
         <CardHeader>
           <CardTitle className="text-lg">Important Notes</CardTitle>
         </CardHeader>
         <CardContent>
           <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <li className="flex items-start gap-2 cursor-help">
                     <span className="text-blue-500 mt-0.5">•</span>
                     <span className="flex-1">The system automatically combines all CSV files in the training directory</span>
                     <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                   </li>
                 </TooltipTrigger>
                 <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                   <p className="font-semibold mb-1">Automatic CSV Combination</p>
                   <p className="text-xs">
                     When you retrain the model, the system scans the training directory and loads all CSV files found there. 
                     These files are automatically merged together before processing, so you don't need to manually combine them. 
                     This allows you to add new data incrementally by uploading additional CSV files.
                   </p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>

             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <li className="flex items-start gap-2 cursor-help">
                     <span className="text-blue-500 mt-0.5">•</span>
                     <span className="flex-1">Duplicate registrations (same fileNo + dateOfRenewal) are automatically removed</span>
                     <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                   </li>
                 </TooltipTrigger>
                 <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                   <p className="font-semibold mb-1">Duplicate Removal</p>
                   <p className="text-xs">
                     The system identifies duplicates based on fileNo + dateOfRenewal. This prevents duplicate registrations 
                     from appearing in the training data. Using fileNo is more reliable because temporary plate numbers 
                     (like "11010") can be duplicates. The system will show you how many duplicates were removed after processing.
                   </p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>

             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <li className="flex items-start gap-2 cursor-help">
                     <span className="text-blue-500 mt-0.5">•</span>
                     <span className="flex-1">CSV files must contain the required columns (fileNo, dateOfRenewal, address_municipality). fileNo is used for duplicate detection. Extra columns are acceptable and will be ignored.</span>
                     <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                   </li>
                 </TooltipTrigger>
                 <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                   <p className="font-semibold mb-1">Column Structure Requirement</p>
                   <p className="text-xs">
                     Your CSV file must contain at least these columns: <strong>fileNo</strong>, <strong>dateOfRenewal</strong>, 
                     and <strong>address_municipality</strong> (all required). The column names must match exactly (case-sensitive). 
                     <strong>fileNo</strong> is used for deduplication since temporary plate numbers can be duplicates. You can also 
                     include <strong>ownerName</strong> and <strong>plateNo</strong> (both optional) and any other additional columns - 
                     they will be ignored during processing.
                   </p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>

             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <li className="flex items-start gap-2 cursor-help">
                     <span className="text-blue-500 mt-0.5">•</span>
                     <span className="flex-1">Model retraining may take several minutes depending on data size</span>
                     <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                   </li>
                 </TooltipTrigger>
                 <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                   <p className="font-semibold mb-1">Training Time</p>
                   <p className="text-xs">
                     Retraining involves processing all CSV files, aggregating data by week, and training a SARIMA 
                     time series model. The time required depends on the total number of registrations and weeks of data. 
                     Larger datasets (more files or more registrations) will take longer. The system has a 5-minute timeout, 
                     so very large datasets may need to be split into smaller batches.
                   </p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>

             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <li className="flex items-start gap-2 cursor-help">
                     <span className="text-blue-500 mt-0.5">•</span>
                     <span className="flex-1">Only registrations from Davao Oriental municipalities will be included in training</span>
                     <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                   </li>
                 </TooltipTrigger>
                 <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                   <p className="font-semibold mb-1">Municipality Filtering</p>
                   <p className="text-xs">
                     The system automatically filters data to only include registrations where address_municipality matches 
                     one of the Davao Oriental municipalities: BAGANGA, BANAYBANAY, BOSTON, CARAGA, CATEEL, GOVERNOR GENEROSO, 
                     LUPON, MANAY, SAN ISIDRO, TARRAGONA, or CITY OF MATI. Registrations from other municipalities are 
                     excluded to ensure the model is trained specifically on relevant data for Davao Oriental predictions.
                   </p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </ul>
         </CardContent>
       </Card>

       </div>

      {/* Success Modal - Simplified */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => {
        setShowSuccessModal(open);
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              Model Successfully Retrained!
            </DialogTitle>
            <DialogDescription>
              {hasNewFile 
                ? 'The prediction model has been updated with new data.'
                : 'The prediction model has been retrained using existing data.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Duplicate Information */}
            {duplicateInfo && duplicateInfo.duplicates_removed > 0 && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900 dark:text-orange-300 text-sm">
                      {duplicateInfo.duplicates_removed} duplicate record(s) were removed during processing
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                      Duplicates were identified based on the same <strong>fileNo</strong> and <strong>dateOfRenewal</strong> combination.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Success Message */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                The model has been successfully retrained and is ready to use for predictions.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link to="/trained-models/vehicle">
                View Vehicle Model
              </Link>
            </Button>
            <Button onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Information Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Duplicate Records Removed
            </DialogTitle>
            <DialogDescription>
              The system automatically removed duplicate registration records during processing.
            </DialogDescription>
          </DialogHeader>
          
          {duplicateInfo && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-300">
                      {duplicateInfo.duplicates_removed} duplicate record(s) removed
                    </p>
                     <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                       Duplicates were identified based on the same <strong>fileNo</strong> and <strong>dateOfRenewal</strong> combination.
                     </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total rows before deduplication:</span>
                  <span className="font-medium">{duplicateInfo.total_rows_before_dedup?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duplicates removed:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {duplicateInfo.duplicates_removed?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Total rows after deduplication:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {duplicateInfo.total_rows_after_dedup?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </div>

              {duplicateInfo.csv_files && duplicateInfo.csv_files.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    CSV files processed:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {duplicateInfo.csv_files.slice(0, 5).map((file, idx) => (
                      <li key={idx}>{file}</li>
                    ))}
                    {duplicateInfo.csv_files.length > 5 && (
                      <li className="text-gray-500">...and {duplicateInfo.csv_files.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDuplicateModal(false)} className="w-full sm:w-auto">
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              {errorDetails?.title || 'Error'}
            </DialogTitle>
            <DialogDescription>
              {errorDetails?.message || 'An error occurred while processing the request.'}
            </DialogDescription>
          </DialogHeader>
          
          {errorDetails && (
            <div className="py-4">
              {errorDetails.type === 'format' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    Please check your CSV file format and ensure it contains the required columns.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowErrorModal(false)} className="w-full sm:w-auto">
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
} 
                        ? `${trainingData.training_weeks} weeks`
                        : 'N/A'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                              MAPE
                            </p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                              {trainingData.accuracy_metrics.mape 
                                ? `${trainingData.accuracy_metrics.mape.toFixed(2)}%`
                                : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Mean Absolute Percentage Error
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">MAPE (Mean Absolute Percentage Error)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> A measure of the average percentage difference between predicted and actual values.</p>
                              <p><strong>What it means:</strong> Lower MAPE = better accuracy. A MAPE of {trainingData.accuracy_metrics.mape?.toFixed(2)}% means predictions are off by about {trainingData.accuracy_metrics.mape?.toFixed(2)}% on average.</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.accuracy_metrics.mape !== undefined && trainingData.accuracy_metrics.mape !== null ? (
                                trainingData.accuracy_metrics.mape < 10 ? '✅ Excellent! Less than 10% error is very accurate.' :
                                trainingData.accuracy_metrics.mape < 20 ? '✅ Good! 10-20% error is acceptable for most business decisions.' :
                                trainingData.accuracy_metrics.mape < 30 ? '⚠️ Acceptable. 20-30% error may need attention for critical decisions.' :
                                '❌ Poor. Over 30% error indicates the model needs improvement.'
                              ) : 'Lower is better - aim for under 20% for good performance.'}</p>
                              <p><strong>What it helps with:</strong> Helps you understand prediction accuracy in percentage terms, making it easy to compare across different scales and time periods.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-green-600 dark:text-green-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">MAE</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                              {trainingData.accuracy_metrics.mae?.toFixed(2) || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Mean Absolute Error
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">MAE (Mean Absolute Error)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> The average number of registrations the model is off by (in actual units).</p>
                              <p><strong>What it means:</strong> A MAE of {trainingData.accuracy_metrics.mae?.toFixed(2)} means predictions are wrong by about {Math.round(trainingData.accuracy_metrics.mae || 0)} registrations on average. Lower is better.</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.accuracy_metrics.mae !== undefined && trainingData.accuracy_metrics.mae !== null && trainingData.accuracy_metrics.mean_actual ? (
                                (trainingData.accuracy_metrics.mae / trainingData.accuracy_metrics.mean_actual) < 0.1 ? '✅ Excellent! Error is less than 10% of average value.' :
                                (trainingData.accuracy_metrics.mae / trainingData.accuracy_metrics.mean_actual) < 0.2 ? '✅ Good! Error is 10-20% of average value.' :
                                (trainingData.accuracy_metrics.mae / trainingData.accuracy_metrics.mean_actual) < 0.3 ? '⚠️ Acceptable. Error is 20-30% of average value.' :
                                '❌ Poor. Error exceeds 30% of average value - model needs improvement.'
                              ) : 'Lower is better - compare to your average daily registrations to assess impact.'}</p>
                              <p><strong>What it helps with:</strong> Provides an intuitive understanding of prediction errors in the same units as your data, helping you gauge practical impact.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">RMSE</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                              {trainingData.accuracy_metrics.rmse?.toFixed(2) || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Root Mean Square Error
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">RMSE (Root Mean Square Error)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> A measure similar to MAE but gives more weight to larger errors (penalizes big mistakes more).</p>
                              <p><strong>What it means:</strong> A RMSE of {trainingData.accuracy_metrics.rmse?.toFixed(2)} means some predictions have significant errors. Lower is better. RMSE is typically higher than MAE when there are large prediction errors.</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.accuracy_metrics.rmse !== undefined && trainingData.accuracy_metrics.rmse !== null && trainingData.accuracy_metrics.mae !== undefined && trainingData.accuracy_metrics.mae !== null ? (
                                trainingData.accuracy_metrics.rmse / trainingData.accuracy_metrics.mae < 1.2 ? '✅ Good! RMSE is close to MAE, indicating consistent errors without large outliers.' :
                                trainingData.accuracy_metrics.rmse / trainingData.accuracy_metrics.mae < 1.5 ? '⚠️ Acceptable. Some larger errors present, but manageable.' :
                                '❌ Poor. RMSE much higher than MAE indicates frequent large errors that need attention.'
                              ) : 'Lower is better - compare to MAE: if RMSE is much higher, you have large prediction errors.'}</p>
                              <p><strong>What it helps with:</strong> Identifies if your model has occasional large errors that need attention, even if average errors seem acceptable.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">R²</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                              {trainingData.accuracy_metrics.r2 !== undefined && trainingData.accuracy_metrics.r2 !== null
                                ? trainingData.accuracy_metrics.r2.toFixed(4)
                                : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Coefficient of Determination
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">R² (Coefficient of Determination)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> A measure of how well the model explains the variance in the data (proportion of variance explained).</p>
                              <p><strong>What it means:</strong> R² ranges from 0 to 1, where 1 means perfect fit. {trainingData.accuracy_metrics.r2 !== undefined && trainingData.accuracy_metrics.r2 !== null 
                                ? ` An R² of ${trainingData.accuracy_metrics.r2.toFixed(4)} means the model explains ${(trainingData.accuracy_metrics.r2 * 100).toFixed(2)}% of the variance.`
                                : ' Higher is better.'}</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.accuracy_metrics.r2 !== undefined && trainingData.accuracy_metrics.r2 !== null ? (
                                trainingData.accuracy_metrics.r2 >= 0.8 ? '✅ Excellent! R² ≥ 0.8 indicates the model explains most of the variance very well.' :
                                trainingData.accuracy_metrics.r2 >= 0.6 ? '✅ Good! R² 0.6-0.8 shows solid explanatory power.' :
                                trainingData.accuracy_metrics.r2 >= 0.4 ? '⚠️ Acceptable. R² 0.4-0.6 is moderate but may need improvement.' :
                                trainingData.accuracy_metrics.r2 >= 0 ? '❌ Poor. R² < 0.4 indicates weak explanatory power.' :
                                '❌ Very Poor. Negative R² means the model performs worse than just predicting the mean.'
                              ) : 'Higher is better - aim for R² ≥ 0.6 for good performance, ≥ 0.8 for excellent.'}</p>
                              <p><strong>What it helps with:</strong> Provides a standardized measure of model quality independent of data scale, helping you understand overall model performance.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}

              {/* Test Accuracy Metrics (Out-of-Sample) */}
              {trainingData.test_accuracy_metrics && (
                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Test Accuracy (Out-of-Sample) - {trainingData.test_weeks || 'N/A'} weeks
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-green-600 dark:text-green-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                              MAPE
                            </p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                              {trainingData.test_accuracy_metrics.mape 
                                ? `${trainingData.test_accuracy_metrics.mape.toFixed(2)}%`
                                : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Mean Absolute Percentage Error
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">MAPE (Test Set)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> Out-of-sample accuracy measure on unseen test data (data the model hasn't seen during training).</p>
                              <p><strong>What it means:</strong> A MAPE of {trainingData.test_accuracy_metrics.mape?.toFixed(2)}% means predictions on the test set are off by about {trainingData.test_accuracy_metrics.mape?.toFixed(2)}% on average. This is a more realistic measure of model performance than training accuracy.</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.test_accuracy_metrics.mape !== undefined && trainingData.test_accuracy_metrics.mape !== null ? (
                                trainingData.test_accuracy_metrics.mape < 10 ? '✅ Excellent! Less than 10% error on unseen data is very reliable.' :
                                trainingData.test_accuracy_metrics.mape < 20 ? '✅ Good! 10-20% error on test data indicates good generalization.' :
                                trainingData.test_accuracy_metrics.mape < 30 ? '⚠️ Acceptable. 20-30% error suggests the model may overfit - monitor closely.' :
                                '❌ Poor. Over 30% error on test data indicates poor generalization - model needs improvement.'
                              ) : 'Lower is better - compare to training MAPE: if test MAPE is much higher, the model may be overfitting.'}</p>
                              <p><strong>What it helps with:</strong> Provides realistic expectations for future predictions, ensuring the model will perform reliably on new data.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-green-600 dark:text-green-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">MAE</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                              {trainingData.test_accuracy_metrics.mae?.toFixed(2) || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Mean Absolute Error
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">MAE (Test Set)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> The average number of registrations the model is off by on unseen test data.</p>
                              <p><strong>What it means:</strong> A MAE of {trainingData.test_accuracy_metrics.mae?.toFixed(2)} means test predictions are wrong by about {Math.round(trainingData.test_accuracy_metrics.mae || 0)} registrations on average.</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.test_accuracy_metrics.mae !== undefined && trainingData.test_accuracy_metrics.mae !== null && trainingData.test_accuracy_metrics.mean_actual ? (
                                (trainingData.test_accuracy_metrics.mae / trainingData.test_accuracy_metrics.mean_actual) < 0.1 ? '✅ Excellent! Test error is less than 10% of average - very reliable.' :
                                (trainingData.test_accuracy_metrics.mae / trainingData.test_accuracy_metrics.mean_actual) < 0.2 ? '✅ Good! Test error is 10-20% of average - acceptable for planning.' :
                                (trainingData.test_accuracy_metrics.mae / trainingData.test_accuracy_metrics.mean_actual) < 0.3 ? '⚠️ Acceptable. Test error is 20-30% of average - use with caution.' :
                                '❌ Poor. Test error exceeds 30% of average - model struggles on new data.'
                              ) : trainingData.accuracy_metrics?.mae ? (
                                `Compare to training MAE (${trainingData.accuracy_metrics.mae.toFixed(2)}): ${trainingData.test_accuracy_metrics.mae > trainingData.accuracy_metrics.mae * 1.5 ? '❌ Test MAE is much higher - model may be overfitting.' : '✅ Test MAE is similar to training - good generalization.'}`
                              ) : 'Lower is better - compare to training MAE to check if model generalizes well.'}</p>
                              <p><strong>What it helps with:</strong> Shows the actual prediction error you can expect in real-world usage, helping you plan for uncertainty.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-green-600 dark:text-green-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">RMSE</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                              {trainingData.test_accuracy_metrics.rmse?.toFixed(2) || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Root Mean Square Error
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">RMSE (Test Set)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> A measure similar to MAE but gives more weight to larger errors on the test set (penalizes big mistakes).</p>
                              <p><strong>What it means:</strong> A RMSE of {trainingData.test_accuracy_metrics.rmse?.toFixed(2)} means some test predictions have significant errors. Lower is better.</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.test_accuracy_metrics.rmse !== undefined && trainingData.test_accuracy_metrics.rmse !== null && trainingData.test_accuracy_metrics.mae !== undefined && trainingData.test_accuracy_metrics.mae !== null ? (
                                trainingData.test_accuracy_metrics.rmse / trainingData.test_accuracy_metrics.mae < 1.2 ? '✅ Good! Test RMSE close to MAE indicates consistent errors without large outliers.' :
                                trainingData.test_accuracy_metrics.rmse / trainingData.test_accuracy_metrics.mae < 1.5 ? '⚠️ Acceptable. Some larger errors on test data, but manageable.' :
                                '❌ Poor. Test RMSE much higher than MAE indicates frequent large errors on new data - needs attention.'
                              ) : trainingData.accuracy_metrics?.rmse && trainingData.test_accuracy_metrics.rmse ? (
                                `Compare to training RMSE (${trainingData.accuracy_metrics.rmse.toFixed(2)}): ${trainingData.test_accuracy_metrics.rmse > trainingData.accuracy_metrics.rmse * 1.5 ? '❌ Test RMSE is much higher - model struggles with new data.' : '✅ Test RMSE is similar to training - good generalization.'}`
                              ) : 'Lower is better - compare to test MAE and training RMSE to assess consistency.'}</p>
                              <p><strong>What it helps with:</strong> Identifies if your model has occasional large prediction errors on new data that could impact decision-making.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 relative">
                            <div className="absolute top-2 right-2">
                              <HelpCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 cursor-help" />
                            </div>
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">R²</p>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                              {trainingData.test_accuracy_metrics.r2 !== undefined && trainingData.test_accuracy_metrics.r2 !== null
                                ? trainingData.test_accuracy_metrics.r2.toFixed(4)
                                : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Coefficient of Determination
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                          <div className="space-y-2">
                            <p className="font-semibold">R² (Test Set)</p>
                            <div className="text-xs space-y-1">
                              <p><strong>What it is:</strong> A measure of how well the model explains the variance in unseen test data.</p>
                              <p><strong>What it means:</strong> R² ranges from 0 to 1, where 1 means perfect fit. {trainingData.test_accuracy_metrics.r2 !== undefined && trainingData.test_accuracy_metrics.r2 !== null 
                                ? ` An R² of ${trainingData.test_accuracy_metrics.r2.toFixed(4)} means the model explains ${(trainingData.test_accuracy_metrics.r2 * 100).toFixed(2)}% of the variance.`
                                : ' Higher is better.'}</p>
                              <p><strong>Is this good or bad?</strong> {trainingData.test_accuracy_metrics.r2 !== undefined && trainingData.test_accuracy_metrics.r2 !== null ? (
                                trainingData.test_accuracy_metrics.r2 >= 0.8 ? '✅ Excellent! R² ≥ 0.8 on test data shows strong generalization.' :
                                trainingData.test_accuracy_metrics.r2 >= 0.6 ? '✅ Good! R² 0.6-0.8 on test data indicates reliable predictions.' :
                                trainingData.test_accuracy_metrics.r2 >= 0.4 ? '⚠️ Acceptable. R² 0.4-0.6 on test data is moderate - monitor performance.' :
                                trainingData.test_accuracy_metrics.r2 >= 0 ? '❌ Poor. R² < 0.4 on test data indicates weak generalization.' :
                                '❌ Very Poor. Negative R² means the model performs worse than predicting the mean on new data.'
                              ) : trainingData.accuracy_metrics?.r2 !== undefined && trainingData.accuracy_metrics?.r2 !== null ? (
                                `Compare to training R² (${trainingData.accuracy_metrics.r2.toFixed(4)}): ${trainingData.test_accuracy_metrics.r2 !== undefined && trainingData.test_accuracy_metrics.r2 !== null && trainingData.test_accuracy_metrics.r2 < trainingData.accuracy_metrics.r2 * 0.8 ? '❌ Test R² is much lower - model may be overfitting.' : '✅ Test R² is similar to training - good generalization.'}`
                              ) : 'Higher is better - compare to training R² to check if model generalizes well.'}</p>
                              <p><strong>What it helps with:</strong> Validates that the model's explanatory power generalizes to new data, not just the training data it learned from.</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}
                  </div>
                </div>

                {/* Page 2: Model Diagnostics & Parameters */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    currentPage === 1 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 absolute inset-0 -translate-x-full pointer-events-none'
                  }`}
                >
                  <div className="space-y-4 py-4">
                    {/* Model Diagnostics */}
                    {trainingData.diagnostics && (
                      <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Model Diagnostics
                  </h3>
                  
                  {/* Residuals Randomness Check */}
                  <div className={`p-3 rounded-lg border ${
                    trainingData.diagnostics.residuals_random 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                      : trainingData.diagnostics.residuals_random === false
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Residuals Randomness
                        </p>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                <div className="space-y-2">
                                  <p className="font-semibold">Residuals Randomness</p>
                                  <div className="text-xs space-y-1">
                                    <p><strong>What it is:</strong> A test to check if the model's prediction errors (residuals) are random or contain patterns.</p>
                                    <p><strong>What it means:</strong> Random residuals indicate the model captured all patterns. Non-random residuals suggest the model missed some patterns in the data.</p>
                                    <p><strong>What it helps with:</strong> Helps you determine if the model is reliable or needs improvement to capture more patterns.</p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {trainingData.diagnostics.residuals_random === true 
                            ? '✓ Residuals are random - model fits well!' 
                            : trainingData.diagnostics.residuals_random === false
                            ? '⚠ Residuals show patterns - model may need improvement'
                            : 'Could not determine'}
                        </p>
                        {trainingData.diagnostics.ljung_box_pvalue !== null && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                            Ljung-Box p-value: {trainingData.diagnostics.ljung_box_pvalue.toFixed(4)} 
                            {trainingData.diagnostics.ljung_box_pvalue > 0.05 && ' (p > 0.05 = random)'}
                          </p>
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                  <div className="space-y-2">
                                    <p className="font-semibold">Ljung-Box Test</p>
                                    <div className="text-xs space-y-1">
                                      <p><strong>What it is:</strong> A statistical test that checks if residuals are random (white noise) or contain autocorrelation.</p>
                                      <p><strong>What it means:</strong> p-value &gt; 0.05 means residuals are random (good). p-value ≤ 0.05 means patterns exist (may need model improvement).</p>
                                      <p><strong>What it helps with:</strong> Provides a quantitative measure to validate model quality and identify if more features or parameters are needed.</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                      {trainingData.diagnostics.residuals_random !== null && (
                        <div className={`text-2xl ${trainingData.diagnostics.residuals_random ? 'text-green-600' : 'text-yellow-600'}`}>
                          {trainingData.diagnostics.residuals_random ? '✓' : '⚠'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACF/PACF Summary */}
                  {trainingData.diagnostics.acf_values && trainingData.diagnostics.acf_values.length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ACF/PACF Analysis
                      </p>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 cursor-help hover:text-blue-700 dark:hover:text-blue-300" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                              <div className="space-y-2">
                                <p className="font-semibold">ACF/PACF Analysis</p>
                                <div className="text-xs space-y-1">
                                  <p><strong>What it is:</strong> ACF (Autocorrelation Function) and PACF (Partial Autocorrelation Function) measure correlation between residuals at different time lags.</p>
                                  <p><strong>What it means:</strong> Values within ±0.2 indicate random residuals. Values outside ±0.2 suggest leftover patterns the model didn't capture.</p>
                                  <p><strong>What it helps with:</strong> Helps identify specific lag patterns that need to be addressed in model improvements.</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Checked {trainingData.diagnostics.acf_values.length} lags for leftover autocorrelation
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700 dark:text-gray-300">ACF Lags:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{trainingData.diagnostics.acf_values.length}</span>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-2">
                                <div className="text-xs">
                                  <p><strong>ACF Lags:</strong> Number of time steps checked for correlation between residuals.</p>
                        </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700 dark:text-gray-300">PACF Lags:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{trainingData.diagnostics.pacf_values?.length || 0}</span>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-2">
                                <div className="text-xs">
                                  <p><strong>PACF Lags:</strong> Similar to ACF but removes indirect correlations, showing direct relationships only.</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      {trainingData.diagnostics.acf_values.some(acf => Math.abs(acf.value) > 0.2) && (
                        <div className="flex items-start gap-2 mt-2">
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                          ⚠ Some ACF values exceed ±0.2 - may indicate leftover autocorrelation
                        </p>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 cursor-help hover:text-yellow-700 dark:hover:text-yellow-300 mt-0.5" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                <div className="space-y-2">
                                  <p className="font-semibold">ACF Values Exceeding ±0.2</p>
                                  <div className="text-xs space-y-1">
                                    <p><strong>What it is:</strong> ACF values outside the ±0.2 range indicate significant correlation at specific time lags.</p>
                                    <p><strong>What it means:</strong> The model may have missed some patterns or seasonal effects that could improve predictions.</p>
                                    <p><strong>What it helps with:</strong> Identifies specific areas where the model could be enhanced, such as adding more seasonal parameters or exogenous variables.</p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Residual Statistics */}
                  {trainingData.diagnostics.residuals_mean !== null && (
                    <div className="grid grid-cols-2 gap-3 text-base">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Residuals Mean:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{trainingData.diagnostics.residuals_mean.toFixed(4)}</span>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                              <div className="space-y-2">
                                <p className="font-semibold">Residuals Mean</p>
                                <div className="text-xs space-y-1">
                                  <p><strong>What it is:</strong> The average of all prediction errors (actual - predicted).</p>
                                  <p><strong>What it means:</strong> Should be close to 0. Values far from 0 indicate systematic bias (over or under-prediction).</p>
                                  <p><strong>What it helps with:</strong> Identifies if the model consistently overestimates or underestimates, helping you adjust expectations or improve the model.</p>
                      </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Residuals Std:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{trainingData.diagnostics.residuals_std.toFixed(4)}</span>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                              <div className="space-y-2">
                                <p className="font-semibold">Residuals Standard Deviation</p>
                                <div className="text-xs space-y-1">
                                  <p><strong>What it is:</strong> A measure of how spread out the prediction errors are.</p>
                                  <p><strong>What it means:</strong> Lower values indicate more consistent predictions. Higher values mean more variability in errors.</p>
                                  <p><strong>What it helps with:</strong> Helps you understand prediction uncertainty - higher std means less reliable individual predictions.</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>
              )}

                    {/* Model Parameters (Best Parameters from auto_arima) */}
                    {trainingData.model_params && (
                      <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-base flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          Best Model Parameters (Auto-Selected)
                        </h3>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {trainingData.model_params.full_params && (
                              <div className="col-span-2 flex items-start gap-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">SARIMA Order:</span>
                                <span className="ml-2 font-mono font-semibold text-indigo-900 dark:text-indigo-300">
                                  ({trainingData.model_params.full_params[0]},{trainingData.model_params.full_params[1]},{trainingData.model_params.full_params[2]})
                                  ({trainingData.model_params.full_params[3]},{trainingData.model_params.full_params[4]},{trainingData.model_params.full_params[5]},{trainingData.model_params.full_params[6]})
                                </span>
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400 cursor-help hover:text-indigo-700 dark:hover:text-indigo-300 mt-0.5" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                      <div className="space-y-2">
                                        <p className="font-semibold">SARIMA Order</p>
                                        <div className="text-xs space-y-1">
                                          <p><strong>What it is:</strong> The complete parameter set (p,d,q)(P,D,Q,s) that defines the SARIMA model structure.</p>
                                          <p><strong>What it means:</strong> These numbers control how the model learns patterns: p/P=autoregressive, d/D=differencing, q/Q=moving average, s=seasonal period.</p>
                                          <p><strong>What it helps with:</strong> Understanding the model complexity and how it processes time series patterns. Auto-selected to balance fit and simplicity.</p>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                            {trainingData.model_params.order && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Non-Seasonal (p,d,q):</span>
                                <span className="font-mono font-semibold text-indigo-900 dark:text-indigo-300">
                                  ({trainingData.model_params.order.join(',')})
                                </span>
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 cursor-help hover:text-indigo-700 dark:hover:text-indigo-300" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-2">
                                      <div className="text-xs space-y-1">
                                        <p><strong>Non-Seasonal (p,d,q):</strong> p=AR terms, d=differencing, q=MA terms. Controls non-seasonal patterns.</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                            {trainingData.model_params.seasonal_order && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Seasonal (P,D,Q,s):</span>
                                <span className="font-mono font-semibold text-indigo-900 dark:text-indigo-300">
                                  ({trainingData.model_params.seasonal_order.join(',')})
                                </span>
                                <TooltipProvider>
                                  <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 cursor-help hover:text-indigo-700 dark:hover:text-indigo-300" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-2">
                                      <div className="text-xs space-y-1">
                                        <p><strong>Seasonal (P,D,Q,s):</strong> P,D,Q=seasonal equivalents, s=seasonal period (7 for weekly cycles). Controls seasonal patterns.</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-2 mt-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Parameters automatically selected by pmdarima.auto_arima based on AIC optimization
                            </p>
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 cursor-help hover:text-gray-700 dark:hover:text-gray-300 mt-0.5" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                  <div className="space-y-2">
                                    <p className="font-semibold">Auto Parameter Selection</p>
                                    <div className="text-xs space-y-1">
                                      <p><strong>What it is:</strong> pmdarima.auto_arima automatically tests hundreds of parameter combinations to find the best fit.</p>
                                      <p><strong>What it means:</strong> The model uses AIC (Akaike Information Criterion) to balance prediction accuracy with model complexity, preventing overfitting.</p>
                                      <p><strong>What it helps with:</strong> Ensures optimal model configuration without manual tuning, saving time and improving reliability.</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Page 3: Training Information & Model Summary */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    currentPage === 2 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 absolute inset-0 translate-x-full pointer-events-none'
                  }`}
                >
                  <div className="space-y-4 py-2">
                    {/* KPI Cards Grid - 4 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Training Days KPI Card */}
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Training Days</p>
                          <BarChart3 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        </div>
                        <p className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-0.5">
                          {trainingData.training_days 
                            ? `${trainingData.training_days}`
                            : trainingData.training_weeks 
                              ? `${trainingData.training_weeks * 7}`
                              : 'N/A'}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {trainingData.training_days 
                            ? `${Math.round(trainingData.training_days / 7)} weeks`
                            : trainingData.training_weeks 
                              ? `${trainingData.training_weeks} weeks`
                              : ''}
                        </p>
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-blue-500 dark:text-blue-400 cursor-help mt-1" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                              <div className="space-y-2">
                                <p className="font-semibold">Training Days</p>
                                <div className="text-xs space-y-1">
                                  <p><strong>What it is:</strong> The number of days of historical data used to train the model (80% of total data).</p>
                                  <p><strong>What it means:</strong> More training data generally leads to better pattern recognition, but requires sufficient data quality.</p>
                                  <p><strong>What it helps with:</strong> Understanding how much historical data the model learned from, which affects prediction reliability.</p>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Test Days KPI Card */}
                      {(trainingData.test_days || trainingData.test_weeks) && (
                        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Test Days</p>
                            <BarChart3 className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                          </div>
                          <p className="text-xl font-bold text-green-900 dark:text-green-100 mb-0.5">
                            {trainingData.test_days 
                              ? `${trainingData.test_days}`
                              : trainingData.test_weeks 
                                ? `${trainingData.test_weeks * 7}`
                                : 'N/A'}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {trainingData.test_days 
                              ? `${Math.round(trainingData.test_days / 7)} weeks`
                              : trainingData.test_weeks 
                                ? `${trainingData.test_weeks} weeks`
                                : ''}
                          </p>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-green-500 dark:text-green-400 cursor-help mt-1" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                <div className="space-y-2">
                                  <p className="font-semibold">Test Days</p>
                                  <div className="text-xs space-y-1">
                                    <p><strong>What it is:</strong> The number of days reserved for testing model accuracy (20% of total data, most recent).</p>
                                    <p><strong>What it means:</strong> Out-of-sample data the model hasn't seen during training, used to validate true prediction performance.</p>
                                    <p><strong>What it helps with:</strong> Provides realistic accuracy estimates for future predictions, ensuring the model works on unseen data.</p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}

                      {/* Total Registrations KPI Card */}
                      {trainingData.processing_info?.total_registrations && (
                        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Total Registrations</p>
                            <File className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                          </div>
                          <p className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-0.5">
                            {trainingData.processing_info.total_registrations?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-xs text-purple-700 dark:text-purple-300">Records processed</p>
                        </div>
                      )}

                      {/* CSV Files Combined KPI Card */}
                      {trainingData.processing_info?.total_csv_files && (
                        <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">CSV Files</p>
                            <File className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                          </div>
                          <p className="text-xl font-bold text-orange-900 dark:text-orange-100 mb-0.5">
                            {trainingData.processing_info.total_csv_files || 'N/A'}
                          </p>
                          <p className="text-xs text-orange-700 dark:text-orange-300">Files combined</p>
                        </div>
                      )}
                    </div>

                    {/* Date Ranges - Two Column Layout with Calendar Icons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Training Date Range */}
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Training Date Range</p>
                        </div>
                        <p className="text-xs text-gray-900 dark:text-white font-medium">
                          {/* Prefer active (non-zero) range if available, otherwise fall back to calendar range */}
                          {trainingData.active_date_ranges?.training?.start
                            ? `${formatDate(trainingData.active_date_ranges.training.start)} – ${formatDate(trainingData.active_date_ranges.training.end)}`
                            : `${trainingData.date_range?.start ? formatDate(trainingData.date_range.start) : 'N/A'} – ${
                                trainingData.date_range?.end ? formatDate(trainingData.date_range.end) : 'N/A'
                              }`}
                        </p>
                      </div>

                      {/* Test Date Range */}
                      {trainingData.test_date_range && (
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Test Date Range</p>
                          </div>
                          <p className="text-xs text-gray-900 dark:text-white font-medium">
                            {/* Prefer active (non-zero) range for test; if none, show calendar window */}
                            {trainingData.active_date_ranges?.test?.start
                              ? `${formatDate(trainingData.active_date_ranges.test.start)} – ${formatDate(
                                  trainingData.active_date_ranges.test.end
                                )}`
                              : `${formatDate(trainingData.test_date_range.start)} – ${formatDate(
                                  trainingData.test_date_range.end
                                )}`}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* AIC and BIC - Two Smaller KPI Cards */}
                    {(trainingData.aic !== undefined || trainingData.bic !== undefined) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {trainingData.aic !== undefined && (
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-shadow cursor-help">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">AIC</p>
                                    <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                                  </div>
                                  <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100 font-mono">
                                    {trainingData.aic.toFixed(2)}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                <p className="text-sm">Lower values indicate better model fit (with penalty for complexity).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {trainingData.bic !== undefined && (
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-shadow cursor-help">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">BIC</p>
                                    <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                                  </div>
                                  <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100 font-mono">
                                    {trainingData.bic.toFixed(2)}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                <p className="text-sm">Lower values indicate better model fit (with penalty for complexity).</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}

                    {/* Cross-Validation Results - Single Large Card */}
                    {(trainingData.cv_results || trainingData.cross_validation) && (
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm flex items-center gap-2 text-green-900 dark:text-green-100">
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            Cross-Validation (TimeSeriesSplit)
                          </h3>
                          <TooltipProvider>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-green-600 dark:text-green-400 cursor-help hover:text-green-700 dark:hover:text-green-300" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                <div className="space-y-2">
                                  <p className="font-semibold">TimeSeriesSplit Cross-Validation</p>
                                  <div className="text-xs space-y-1">
                                    <p><strong>What it is:</strong> A validation method that splits data chronologically and tests the model on future periods.</p>
                                    <p><strong>What it means:</strong> Simulates real-world prediction scenarios where you predict future data based on past data.</p>
                                    <p><strong>What it helps with:</strong> Provides more realistic accuracy estimates than single train-test split, ensuring the model performs well across different time periods.</p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {(() => {
                          const cvData = trainingData.cv_results || trainingData.cross_validation;
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {cvData.mean_mape !== undefined && cvData.mean_mape !== null && (
                                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5 border border-green-200 dark:border-green-700">
                                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Mean MAPE</p>
                                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {cvData.mean_mape.toFixed(2)}%
                                  </p>
                                  <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="w-3 h-3 text-green-600 dark:text-green-400 cursor-help mt-0.5" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                        <div className="space-y-2">
                                          <p className="font-semibold">Mean MAPE</p>
                                          <div className="text-xs space-y-1">
                                            <p><strong>What it is:</strong> The average prediction error (MAPE) across all cross-validation folds.</p>
                                            <p><strong>What it means:</strong> Shows the typical prediction error when the model is tested on different time periods. Lower values indicate better average performance.</p>
                                            <p><strong>What it helps with:</strong> Provides a more reliable estimate of model accuracy than a single test, as it averages performance across multiple validation periods.</p>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                              {cvData.std_mape !== undefined && cvData.std_mape !== null && (
                                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5 border border-green-200 dark:border-green-700">
                                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Std MAPE</p>
                                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {cvData.std_mape.toFixed(2)}%
                                  </p>
                                  <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="w-3 h-3 text-green-600 dark:text-green-400 cursor-help mt-0.5" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                        <div className="space-y-2">
                                          <p className="font-semibold">Std MAPE</p>
                                          <div className="text-xs space-y-1">
                                            <p><strong>What it is:</strong> The standard deviation (spread) of MAPE values across all cross-validation folds.</p>
                                            <p><strong>What it means:</strong> Measures how consistent the model's performance is across different time periods. Lower values mean the model performs similarly across all test periods (more reliable).</p>
                                            <p><strong>What it helps with:</strong> Indicates model stability - a low Std MAPE means you can trust the model will perform consistently, while a high value suggests the model's accuracy varies significantly across different time periods.</p>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                              {cvData.n_splits && (
                                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5 border border-green-200 dark:border-green-700">
                                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-0.5">Folds</p>
                                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                    {cvData.n_splits}
                                  </p>
                                  <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="w-3 h-3 text-green-600 dark:text-green-400 cursor-help mt-0.5" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-3">
                                        <div className="space-y-2">
                                          <p className="font-semibold">Folds</p>
                                          <div className="text-xs space-y-1">
                                            <p><strong>What it is:</strong> The number of times the data was split chronologically for cross-validation testing.</p>
                                            <p><strong>What it means:</strong> Each fold represents a different time period used for testing. More folds mean more comprehensive validation, but require more data.</p>
                                            <p><strong>What it helps with:</strong> More folds provide a more thorough evaluation of model performance across different time periods, giving you greater confidence in the model's reliability.</p>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <p className="text-xs text-green-700 dark:text-green-300 mt-3 pt-2 border-t border-green-200 dark:border-green-700">
                          Walk-forward validation across multiple time periods for robust model evaluation
                        </p>
                      </div>
                    )}
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link to="/trained-models/vehicle">
                View Vehicle Model
              </Link>
            </Button>
            <Button onClick={() => setShowSuccessModal(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Information Modal */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Duplicate Records Removed
            </DialogTitle>
            <DialogDescription>
              The system automatically removed duplicate registration records during processing.
            </DialogDescription>
          </DialogHeader>
          
          {duplicateInfo && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-300">
                      {duplicateInfo.duplicates_removed} duplicate record(s) removed
                    </p>
                     <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                       Duplicates were identified based on the same <strong>fileNo</strong> and <strong>dateOfRenewal</strong> combination.
                     </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total rows before deduplication:</span>
                  <span className="font-medium">{duplicateInfo.total_rows_before_dedup?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duplicates removed:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {duplicateInfo.duplicates_removed?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Total rows after deduplication:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {duplicateInfo.total_rows_after_dedup?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </div>

              {duplicateInfo.csv_files && duplicateInfo.csv_files.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    CSV files processed:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {duplicateInfo.csv_files.slice(0, 5).map((file, idx) => (
                      <li key={idx}>{file}</li>
                    ))}
                    {duplicateInfo.csv_files.length > 5 && (
                      <li className="text-gray-500">...and {duplicateInfo.csv_files.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDuplicateModal(false)} className="w-full sm:w-auto">
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal for CSV Format Issues */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="max-w-lg bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              {errorDetails?.title || 'Error Processing CSV File'}
            </DialogTitle>
            <DialogDescription>
              The CSV file does not meet the required format specifications.
            </DialogDescription>
          </DialogHeader>
          
          {errorDetails && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 dark:text-red-300 mb-2">
                      Format Requirements Not Met
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {errorDetails.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-semibold text-gray-900 dark:text-white mb-2">Required Columns:</p>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                    <li className="flex items-center gap-2">
                      <span className="text-red-600 dark:text-red-400">•</span>
                      <span className="font-mono">fileNo</span>
                      <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-600 dark:text-red-400">•</span>
                      <span className="font-mono">dateOfRenewal</span>
                      <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-red-600 dark:text-red-400">•</span>
                      <span className="font-mono">address_municipality</span>
                      <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>What to do:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300 mt-2">
                  <li>Ensure your CSV file has all required columns with exact names (case-sensitive)</li>
                  <li>Check that dateOfRenewal is in MM/DD/YYYY format</li>
                  <li>Verify that address_municipality contains valid Davao Oriental municipality names</li>
                  <li>Review the CSV File Format Requirements section above for detailed specifications</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowErrorModal(false)} className="w-full sm:w-auto">
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

