import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  TrendingUp, 
  Info, 
  BarChart3, 
  RefreshCw,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import apiClient from '@/api/axios';
import { useAuth } from '@/context/AuthContext';

// Get Flask API URL from environment variable or use default
const getAccidentPredictionAPIBase = () => {
  if (import.meta.env.VITE_ACCIDENT_PRED_API) {
    return import.meta.env.VITE_ACCIDENT_PRED_API;
  }
  
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:5004';
  }
  
  return '/accident-prediction-api';
};

const ACCIDENT_PREDICTION_API_BASE = getAccidentPredictionAPIBase();

export default function AccidentPredictionPage() {
  const { token } = useAuth();
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [showRetrainProgressModal, setShowRetrainProgressModal] = useState(false);
  const [showRetrainSuccessModal, setShowRetrainSuccessModal] = useState(false);
  const abortControllerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const completionHandledRef = useRef(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('');
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch model information on component mount
  useEffect(() => {
    fetchModelInfo(false); // Don't show toast on initial load
  }, []);

  const fetchModelInfo = async (showToast = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `${ACCIDENT_PREDICTION_API_BASE}/api/accidents/health`;
      console.log('[AccidentPredictionPage] Fetching model info from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to read response as text first to see what we got
        const text = await response.text();
        console.error('Failed to fetch model info', response.status, text);
        throw new Error(`HTTP ${response.status}: Server returned non-OK response. Check if the Flask API is running on the correct port.`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error('Server returned HTML instead of JSON. The Flask API may not be running or the URL is incorrect.');
      }

      const data = await response.json();
      
      if (data.status === 'ok' && data.model_loaded) {
        console.log('[AccidentPredictionPage] Model info received:', data.model_info);
        console.log('[AccidentPredictionPage] Accuracy metrics:', data.model_info?.accuracy_metrics);
        setModelInfo(data.model_info || {});
        // Only show success toast when explicitly requested (e.g., on refresh)
        if (showToast) {
          toast.success('Model information loaded successfully');
        }
      } else {
        throw new Error(data.error || 'Model not loaded on server');
      }
    } catch (err) {
      console.error('Error fetching model info:', err);
      setError(err.message || 'Failed to connect to prediction service');
      // Always show error toast
      if (showToast) {
        toast.error('Failed to load model information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchModelInfo(true); // Show toast on manual refresh
    setRefreshing(false);
  };

  const handleRetrain = async () => {
    setShowRetrainModal(false);
    
    try {
      setRetraining(true);
      setError(null);
      setProgress(0);
      setEstimatedTimeRemaining('');
      
      // Show progress modal immediately
      setShowRetrainProgressModal(true);
      completionHandledRef.current = false; // Reset completion flag
      
      startTimeRef.current = Date.now();
      
      // Call Node.js backend endpoint which logs the activity and proxies to Flask API
      console.log('[AccidentPredictionPage] Starting retrain via backend API');
      
      // Start training (async, returns immediately)
      // Use apiClient to call Node.js backend endpoint which handles logging
      const response = await apiClient.post('/user/retrain-accident-model', 
        { force: true },
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || data.message || 'Failed to start retraining');
      }
      
      // Start polling for progress
      const progressUrl = `${ACCIDENT_PREDICTION_API_BASE}/api/accidents/training-progress`;
      
      progressIntervalRef.current = setInterval(async () => {
        try {
          const progressResponse = await fetch(progressUrl);
          if (!progressResponse.ok) {
            return;
          }
          
          const progressData = await progressResponse.json();
          
          // Update progress
          setProgress(progressData.progress || 0);
          
          // Calculate estimated time remaining based on progress
          const elapsed = progressData.elapsed_time || 0;
          const currentProgress = progressData.progress || 0;
          
          let estimatedRemaining = '';
          if (currentProgress > 0 && currentProgress < 100 && elapsed > 0) {
            // Calculate estimated total time: elapsed / (progress / 100)
            const estimatedTotal = elapsed / (currentProgress / 100);
            const remaining = estimatedTotal - elapsed;
            
            if (remaining > 0) {
              const remainingMinutes = Math.floor(remaining / 60);
              const remainingSeconds = Math.floor(remaining % 60);
              
              if (remainingMinutes > 0) {
                estimatedRemaining = `~${remainingMinutes}m ${remainingSeconds}s remaining`;
              } else if (remainingSeconds > 0) {
                estimatedRemaining = `~${remainingSeconds}s remaining`;
              }
            }
          }
          
          const stepName = progressData.step_name || '';
          const message = progressData.message || '';
          
          // Skip if we've already handled completion
          if (completionHandledRef.current) {
            return;
          }

          if (progressData.completed || progressData.cancelled) {
            // Mark as handled to prevent duplicate processing
            completionHandledRef.current = true;
            
            // Training completed or cancelled - stop polling immediately
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            
            if (progressData.cancelled) {
              // Don't show toast here - the cancel button handler already shows it
              setProgress(0);
              setEstimatedTimeRemaining('Training cancelled');
              setRetraining(false);
              // Modal will be closed by the cancel handler, so don't close it here
              return; // Exit early to prevent further processing
            } else if (progressData.completed) {
              // Update UI state first
              setRetraining(false);
              setProgress(100);
              setEstimatedTimeRemaining('Complete!');
              
              if (progressData.success) {
                // Log completion in account logs
                try {
                  await apiClient.post('/user/log-retrain-completion', 
                    {},
                    {
                      headers: {
                        Authorization: token,
                        'Content-Type': 'application/json',
                      },
                    }
                  );
                } catch (logError) {
                  console.error('Failed to log retrain completion:', logError);
                  // Don't fail the flow if logging fails
                }
                
                // Close progress modal
                setShowRetrainProgressModal(false);
                
                // Refresh model info
                try {
                  await fetchModelInfo(false);
                } catch (err) {
                  console.error('Error refreshing model info:', err);
                }
                
                // Show success modal after a brief delay to ensure progress modal is closed
                setTimeout(() => {
                  setShowRetrainSuccessModal(true);
                }, 500);
                
                return; // Exit early to prevent further processing
              } else {
                throw new Error(progressData.message || 'Training failed');
              }
            }
          } else if (progressData.is_training) {
            // Still training - show step info and estimated remaining time
            if (stepName && message) {
              if (estimatedRemaining) {
                setEstimatedTimeRemaining(`${stepName}: ${message} | ${estimatedRemaining}`);
              } else {
                setEstimatedTimeRemaining(`${stepName}: ${message}`);
              }
            } else if (estimatedRemaining) {
              setEstimatedTimeRemaining(estimatedRemaining);
            } else {
              setEstimatedTimeRemaining('Training in progress...');
            }
          } else {
            // Not training
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          }
        } catch (err) {
          console.error('Error polling progress:', err);
          // Continue polling even if one request fails
        }
      }, 2000); // Poll every 2 seconds

    } catch (err) {
      // Stop polling on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      console.error('Error retraining model:', err);
      let errorMessage = err.message || 'Failed to retrain model. Please check server logs.';
      
      // Remove localhost references from error messages
      if (errorMessage.includes('localhost')) {
        errorMessage = errorMessage.replace(/localhost:\d+/g, 'prediction service');
      }
      if (errorMessage.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to prediction service. Please ensure the Flask API is running.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setRetraining(false);
      setShowRetrainProgressModal(false);
    }
  };

  const handleCancelRetrain = async () => {
    try {
      // Call Node.js backend endpoint which logs the activity and proxies to Flask API
      console.log('[AccidentPredictionPage] Cancelling training via backend API');
      
      // Use apiClient to call Node.js backend endpoint which handles logging
      const response = await apiClient.post('/user/cancel-retrain-accident-model', 
        {},
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = response.data;
      
      // Clean up progress tracking
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setRetraining(false);
      setProgress(0);
      
      if (data.success) {
        setEstimatedTimeRemaining('Training cancelled');
        toast.success('Training cancelled successfully');
        // Close modal after a short delay
        setTimeout(() => {
          setShowRetrainProgressModal(false);
          setEstimatedTimeRemaining('');
        }, 1500);
      } else {
        // Still close the modal even if cancel request had issues
        setEstimatedTimeRemaining('Cancellation requested');
        toast.info(data.message || 'Training cancellation requested. The current step will complete.');
        setTimeout(() => {
          setShowRetrainProgressModal(false);
          setEstimatedTimeRemaining('');
        }, 1500);
      }
    } catch (err) {
      console.error('Error cancelling training:', err);
      // Still clean up UI even if cancel request fails
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setRetraining(false);
      setProgress(0);
      setEstimatedTimeRemaining('Cancellation requested');
      toast.info('Training cancellation requested. Progress updates stopped.');
      setTimeout(() => {
        setShowRetrainProgressModal(false);
        setEstimatedTimeRemaining('');
      }, 1500);
    }
  };

  
  // Determine if we have the new dual-model format or old single-model format
  const hasClassifierModel = modelInfo?.classifier_available || modelInfo?.model_types?.includes('RandomForestClassifier');
  const hasDualModels = hasClassifierModel && (modelInfo?.classifier_metrics || modelInfo?.regressor_metrics);

  // Get accuracy color based on percentage
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getAccuracyBadgeColor = (accuracy) => {
    if (accuracy >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (accuracy >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
  };

  if (loading) {
    return (
      <div className="h-full bg-white dark:bg-black overflow-hidden rounded-lg">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <p className="text-muted-foreground">Loading model information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-white dark:bg-black overflow-hidden rounded-lg">
        <div className="container mx-auto p-6 space-y-6">
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <CardTitle>Error Loading Model</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-black overflow-y-auto rounded-lg">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Accident Prediction Model
          </h1>
          <p className="text-muted-foreground mt-1">
            Random Forest regression model for predicting monthly accident counts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowRetrainModal(true)} 
            disabled={retraining || refreshing} 
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {retraining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Retraining...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retrain Model
              </>
            )}
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing || retraining} variant="outline">
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Model Status Card */}
      <Card className="border-green-200 dark:border-green-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <CardTitle>Model Status</CardTitle>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
              Active
            </Badge>
          </div>
          <CardDescription>
            The model is currently loaded and ready for predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-muted-foreground mb-1">Model Type</div>
              <div className="text-lg font-semibold">
                {(() => {
                  // Handle new format with multiple model types
                  if (modelInfo?.model_types && Array.isArray(modelInfo.model_types)) {
                    if (modelInfo.model_types.length > 1) {
                      return 'Random Forest (Dual Model)';
                    }
                    return modelInfo.model_types[0]
                      .replace('RandomForestRegressor', 'Random Forest')
                      .replace('RandomForestClassifier', 'Random Forest')
                      .replace('Regressor', '')
                      .replace('Classifier', '')
                      .replace('Regression', '')
                      .trim() || 'Random Forest';
                  }
                  // Handle old format with single model type
                  if (modelInfo?.model_type) {
                    return modelInfo.model_type
                      .replace('RandomForestRegressor', 'Random Forest')
                      .replace('Random Forest Regressor', 'Random Forest')
                      .replace('Regressor', '')
                      .replace('Regression', '')
                      .trim() || 'Random Forest';
                  }
                  return 'Random Forest';
                })()}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="text-sm text-muted-foreground mb-1">Training Date</div>
              <div className="text-lg font-semibold">
                {modelInfo?.training_date ? new Date(modelInfo.training_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <div className="text-sm text-muted-foreground mb-1">Features</div>
              <div className="text-lg font-semibold">
                {modelInfo?.feature_count || 0} features
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accuracy Metrics Card */}
      {modelInfo?.accuracy_metrics && Object.keys(modelInfo.accuracy_metrics).length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              <CardTitle>Model Accuracy Metrics</CardTitle>
            </div>
            <CardDescription>
              Performance metrics from test set evaluation for both Random Forest Regressor and Classifier models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Type Labels - Only show for dual-model format */}
            {hasDualModels && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div>
                  <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">High-Risk Prediction (Classifier)</div>
                  <div className="text-xs text-muted-foreground">
                    Predicts whether an area is high-risk for accidents
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Count Prediction (Regressor)</div>
                  <div className="text-xs text-muted-foreground">
                    Predicts the number of accidents expected
                  </div>
                </div>
              </div>
            )}

            {/* Random Forest Regressor Performance Metrics */}
            {(modelInfo.accuracy_metrics?.count_prediction_accuracy !== undefined ||
              modelInfo.accuracy_metrics?.mape !== undefined ||
              modelInfo.accuracy_metrics?.r2_score !== undefined ||
              modelInfo.accuracy_metrics?.accuracy_within_20pct !== undefined ||
              modelInfo.accuracy_metrics?.accuracy_within_30pct !== undefined) && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    Random Forest Regressor Performance Metrics
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Count Prediction Accuracy - Primary Metric */}
                  {hasDualModels && modelInfo.accuracy_metrics?.count_prediction_accuracy !== undefined && (
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-300 dark:border-purple-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">Count Prediction Accuracy</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Accuracy for predicting accident counts (100% - MAPE). This is the primary accuracy metric for the regressor model, showing how accurately it predicts the number of accidents.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                        {modelInfo.accuracy_metrics.count_prediction_accuracy.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* MAPE */}
                  {modelInfo.accuracy_metrics.mape !== undefined && (
                    <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">MAPE</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Mean Absolute Percentage Error. Lower is better.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {modelInfo.accuracy_metrics.mape.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* R² Score */}
                  {modelInfo.accuracy_metrics.r2_score !== undefined && (
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">R² Score</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Coefficient of determination. Closer to 1.0 is better.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {modelInfo.accuracy_metrics.r2_score.toFixed(4)}
                      </div>
                    </div>
                  )}

                  {/* Accuracy within 20% */}
                  {modelInfo.accuracy_metrics.accuracy_within_20pct !== undefined && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">Within ±20%</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Percentage of predictions within 20% of actual values
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {modelInfo.accuracy_metrics.accuracy_within_20pct.toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* Accuracy within 30% */}
                  {modelInfo.accuracy_metrics.accuracy_within_30pct !== undefined && (
                    <div className="p-4 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">Within ±30%</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Percentage of predictions within 30% of actual values
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {modelInfo.accuracy_metrics.accuracy_within_30pct.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Random Forest Classifier Performance Metrics */}
            {hasClassifierModel && modelInfo?.classifier_metrics && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
                    Random Forest Classifier Performance Metrics
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Classifier Test Accuracy - Primary Metric */}
                  {modelInfo.classifier_metrics.accuracy !== undefined && (
                    <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-300 dark:border-indigo-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Test Accuracy</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Percentage of correct predictions on the test set (unseen data). This is the primary accuracy metric for the classifier model.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                        {(modelInfo.classifier_metrics.accuracy * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* Cross-Validation Accuracy - Secondary Info */}
                  {modelInfo.classifier_metrics.cv_accuracy_mean !== undefined && (
                    <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">CV Accuracy</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Cross-validation accuracy averaged across multiple folds. Shows model stability and generalization across different data splits.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {(modelInfo.classifier_metrics.cv_accuracy_mean * 100).toFixed(2)}%
                        {modelInfo.classifier_metrics.cv_accuracy_std !== undefined && (
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            ± {(modelInfo.classifier_metrics.cv_accuracy_std * 100).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Precision */}
                  {modelInfo.classifier_metrics.precision !== undefined && (
                    <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">Precision</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Proportion of positive predictions that were correct
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {(modelInfo.classifier_metrics.precision * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* Recall */}
                  {modelInfo.classifier_metrics.recall !== undefined && (
                    <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">Recall</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Proportion of actual positives that were correctly identified
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {(modelInfo.classifier_metrics.recall * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* F1 Score */}
                  {modelInfo.classifier_metrics.f1_score !== undefined && (
                    <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">F1 Score</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Harmonic mean of precision and recall
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {(modelInfo.classifier_metrics.f1_score * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}

                  {/* ROC-AUC */}
                  {modelInfo.classifier_metrics.roc_auc !== undefined && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">ROC–AUC</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                Area under the ROC curve. Measures the model's ability to distinguish between classes
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-2xl font-bold">
                        {(modelInfo.classifier_metrics.roc_auc * 100).toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Training Data Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-purple-500" />
            <CardTitle>Training Data Information</CardTitle>
          </div>
          <CardDescription>
            Dataset statistics used for model training and evaluation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="text-sm text-muted-foreground mb-1">Training Samples</div>
              <div className="text-2xl font-bold">
                {modelInfo?.training_samples?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Records used for training
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-muted-foreground mb-1">Test Samples</div>
              <div className="text-2xl font-bold">
                {modelInfo?.test_samples?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Records used for evaluation
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Information */}
      <Card className="border-yellow-200 dark:border-yellow-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            <CardTitle>Model Usage</CardTitle>
          </div>
          <CardDescription>
            This model is actively used in the Accident Analytics dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <div className="font-semibold">Predictive Analytics</div>
              <div className="text-sm text-muted-foreground">
                Generates monthly accident count predictions for all barangays to help identify high-risk areas
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <div className="font-semibold">Prescriptive Recommendations</div>
              <div className="text-sm text-muted-foreground">
                Provides actionable intervention strategies based on predicted accident counts
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <div className="font-semibold">Risk Assessment</div>
              <div className="text-sm text-muted-foreground">
                Identifies high-risk time periods and locations for targeted enforcement
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                <strong>Note:</strong> This Random Forest regression model predicts monthly accident counts 
                per barangay based on historical patterns, temporal features, and location-specific characteristics.
              </p>
              <p>
                The model is automatically used in the <strong>Accident Analytics</strong> page to provide 
                real-time predictions and recommendations for traffic safety management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retrain Confirmation Modal */}
      <AlertDialog open={showRetrainModal} onOpenChange={setShowRetrainModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retrain Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to retrain the model? This process may take several minutes and will use the latest data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={retraining}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRetrain}
              disabled={retraining}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {retraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retraining...
                </>
              ) : (
                'Continue'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retrain Progress Modal */}
      <Dialog 
        open={showRetrainProgressModal} 
        onOpenChange={(open) => {
          // Allow closing only if not currently training
          if (!open && !retraining) {
            setShowRetrainProgressModal(false);
          }
        }}
      >
        <DialogContent 
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => {
            // Allow closing only if not currently training
            if (!retraining) {
              setShowRetrainProgressModal(false);
            } else {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Allow closing only if not currently training
            if (!retraining) {
              setShowRetrainProgressModal(false);
            } else {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Retraining Model
            </DialogTitle>
            <DialogDescription className="pt-2">
              Retraining the accident prediction model. This may take a while.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
              {estimatedTimeRemaining && (
                <p className="text-xs text-muted-foreground text-center font-medium">
                  {estimatedTimeRemaining}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center pt-2">
              The model is being trained with the latest data. This process typically takes several minutes.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelRetrain}
              disabled={!retraining}
            >
              Cancel Retrain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retrain Success Modal */}
      <Dialog open={showRetrainSuccessModal} onOpenChange={setShowRetrainSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Retraining Completed Successfully
            </DialogTitle>
            <DialogDescription className="pt-2">
              The accident prediction model has been successfully retrained with the latest data and is now ready to use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              The model has been updated and is now using the most recent accident data for predictions.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowRetrainSuccessModal(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

