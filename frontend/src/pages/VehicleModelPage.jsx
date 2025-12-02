import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { PredictiveAnalytics } from "@/components/analytics/registration/PredictiveAnalytics.jsx";

export default function VehicleModelPage() {
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
              The optimized SARIMA model is loaded and available for vehicle registration predictions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Accuracy and prediction behaviour are summarized below using the latest training run and
              cross-validation metrics.
            </p>
          </CardContent>
        </Card>

        {/* Predictive Analytics (accuracy + charts) */}
        <PredictiveAnalytics />
      </div>
    </div>
  );
}


