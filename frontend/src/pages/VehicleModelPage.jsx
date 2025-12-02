import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle2, RefreshCw, Loader2, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { getModelAccuracy } from "@/api/predictionApi";

export default function VehicleModelPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = async (showToast = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getModelAccuracy();
      if (response.success && response.data) {
        setMetrics(response.data);
      } else {
        setError(response.error || "Failed to load model accuracy metrics.");
      }
    } catch (err) {
      console.error("Error fetching vehicle model accuracy:", err);
      setError(err.message || "Failed to connect to prediction service.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetrics(true);
  };

  // Choose a primary accuracy similar to Accident model header:
  // prefer cross-validation mean_mape, otherwise training MAPE.
  const getPrimaryAccuracy = () => {
    if (!metrics) return null;

    const cv = metrics.cross_validation;
    if (cv && typeof cv.mean_mape === "number" && isFinite(cv.mean_mape)) {
      return Math.max(0, Math.min(100, 100 - cv.mean_mape));
    }

    const trainMape = metrics.in_sample?.mape ?? metrics.mape;
    if (typeof trainMape === "number" && isFinite(trainMape)) {
      return Math.max(0, Math.min(100, 100 - trainMape));
    }

    return null;
  };

  const primaryAccuracy = getPrimaryAccuracy();

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return "text-green-600 dark:text-green-400";
    if (accuracy >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  if (loading) {
    return (
      <div className="h-full bg-white dark:bg-black overflow-hidden rounded-lg">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <p className="text-muted-foreground">Loading vehicle model accuracy...</p>
            </div>
          </div>
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
              <Car className="h-8 w-8 text-blue-500" />
              Vehicle Prediction Model
            </h1>
            <p className="text-muted-foreground mt-1">
              SARIMA time-series model for forecasting monthly vehicle registration volumes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/trained-models/vehicle/mv-prediction">
                <RefreshCw className="mr-2 h-4 w-4" />
                Open Retrain Page
              </Link>
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
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                Active
              </span>
            </div>
            <CardDescription>
              The optimized SARIMA model is currently loaded and ready for vehicle registration predictions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Performance metrics below are based on the latest training run and cross-validation on historical
              registration data.
            </p>
          </CardContent>
        </Card>

        {/* Model Accuracy Metrics (similar style to Accident model page) */}
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Model Accuracy
              </CardTitle>
              <CardDescription>Performance metrics from training, test set, and cross-validation.</CardDescription>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
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
          </CardHeader>
          <CardContent className="space-y-4">
            {primaryAccuracy !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Model Accuracy</span>
                  <span className={`font-semibold ${getAccuracyColor(primaryAccuracy)}`}>
                    {primaryAccuracy.toFixed(2)}%
                  </span>
                </div>
                <Progress value={primaryAccuracy} className="h-2" />
                {metrics?.cross_validation?.mean_mape !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Cross-Validation: { (100 - metrics.cross_validation.mean_mape).toFixed(2)}% accuracy across{" "}
                    {metrics.cross_validation.n_splits} folds (Mean MAPE {metrics.cross_validation.mean_mape.toFixed(2)}%).
                  </p>
                )}
              </div>
            )}

            {/* Training metrics */}
            {metrics?.in_sample && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Training MAPE</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {metrics.in_sample.mape?.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Mean Absolute Percentage Error</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Training MAE</p>
                  <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    {metrics.in_sample.mae?.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Mean Absolute Error</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Training RMSE</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                    {metrics.in_sample.rmse?.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Root Mean Square Error</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">Training R²</p>
                  <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                    {metrics.in_sample.r2 !== null && metrics.in_sample.r2 !== undefined
                      ? metrics.in_sample.r2.toFixed(4)
                      : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Coefficient of Determination</p>
                </div>
              </div>
            )}

            {/* Test metrics */}
            {metrics?.out_of_sample && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Test Accuracy (Out-of-Sample)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Test MAPE</p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {metrics.out_of_sample.mape?.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Mean Absolute Percentage Error</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">Test MAE</p>
                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                      {metrics.out_of_sample.mae?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Mean Absolute Error</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Test RMSE</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {metrics.out_of_sample.rmse?.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Root Mean Square Error</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">Test R²</p>
                    <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                      {metrics.out_of_sample.r2 !== null && metrics.out_of_sample.r2 !== undefined
                        ? metrics.out_of_sample.r2.toFixed(4)
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Coefficient of Determination</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



