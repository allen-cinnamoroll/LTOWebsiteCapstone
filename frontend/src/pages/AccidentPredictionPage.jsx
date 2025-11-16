import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';

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
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch model information on component mount
  useEffect(() => {
    fetchModelInfo(false); // Don't show toast on initial load
  }, []);

  const fetchModelInfo = async (showToast = true) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${ACCIDENT_PREDICTION_API_BASE}/api/accidents/health`, {
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

  // Calculate accuracy percentage from MAPE if available
  const getAccuracyFromMAPE = () => {
    if (modelInfo?.accuracy_metrics?.mape !== undefined) {
      const mape = modelInfo.accuracy_metrics.mape;
      return Math.max(0, Math.min(100, 100 - mape));
    }
    return null;
  };

  const accuracyPercentage = getAccuracyFromMAPE();

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
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
            <p className="text-muted-foreground">Loading model information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
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
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
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
                {modelInfo?.model_type || 'Random Forest Regression'}
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
      {modelInfo?.accuracy_metrics && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              <CardTitle>Model Accuracy Metrics</CardTitle>
            </div>
            <CardDescription>
              Performance metrics from test set evaluation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Accuracy */}
            {accuracyPercentage !== null && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Overall Accuracy</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Calculated as 100% - MAPE (Mean Absolute Percentage Error).
                            Higher is better.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Badge className={getAccuracyBadgeColor(accuracyPercentage)}>
                    {accuracyPercentage.toFixed(2)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      accuracyPercentage >= 80
                        ? 'bg-green-500'
                        : accuracyPercentage >= 60
                        ? 'bg-yellow-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${accuracyPercentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Detailed Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}

