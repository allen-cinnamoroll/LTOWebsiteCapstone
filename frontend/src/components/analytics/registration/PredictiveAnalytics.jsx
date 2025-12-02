import React, { useState, useEffect } from 'react';
import WeeklyPredictionsChart from './WeeklyPredictionsChart.jsx';
import { getModelAccuracy } from '../../../api/predictionApi.js';
import { Loader2 } from 'lucide-react';

export function PredictiveAnalytics() {
  const [accuracy, setAccuracy] = useState(null);
  const [accuracyLoading, setAccuracyLoading] = useState(true);

  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        setAccuracyLoading(true);
        const response = await getModelAccuracy();
        
        if (response.success && response.data) {
          // Prefer a stable, meaningful metric in this order:
          // 1) Test set MAPE (if < 100 and available)
          // 2) Cross-validation mean MAPE
          // 3) Training (in-sample) MAPE
          const testMetrics = response.data.out_of_sample || response.data.test_accuracy_metrics;
          const trainingMetrics = response.data.in_sample || response.data;
          const cvMetrics = response.data.cross_validation;

          let selectedMape = null;
          let source = null;

          // 1) Use test metrics only if MAPE is defined and < 100 (avoid misleading negative accuracy)
          if (testMetrics && typeof testMetrics.mape === 'number' && isFinite(testMetrics.mape) && testMetrics.mape >= 0 && testMetrics.mape < 100) {
            selectedMape = testMetrics.mape;
            source = 'Test Set';
          } else if (cvMetrics && typeof cvMetrics.mean_mape === 'number' && isFinite(cvMetrics.mean_mape)) {
            // 2) Fall back to cross-validation mean MAPE
            selectedMape = cvMetrics.mean_mape;
            source = 'Cross-Validation';
          } else if (trainingMetrics && typeof trainingMetrics.mape === 'number' && isFinite(trainingMetrics.mape)) {
            // 3) Finally, fall back to training MAPE
            selectedMape = trainingMetrics.mape;
            source = 'Training Set';
          }

          if (selectedMape !== null && selectedMape !== undefined) {
            // Calculate accuracy: 100 - MAPE (same as shown in modal)
            const accuracyPercent = Math.max(0, Math.min(100, 100 - selectedMape));

            setAccuracy({
              percent: accuracyPercent,
              mape: selectedMape,
              source,
              level: accuracyPercent >= 80 ? 'High' : accuracyPercent >= 60 ? 'Moderate' : 'Low'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching model accuracy:', error);
      } finally {
        setAccuracyLoading(false);
      }
    };

    fetchAccuracy();
  }, []);

  const getAccuracyDisplay = () => {
    if (!accuracy) return null;
    
    const colorClass = accuracy.percent >= 80 
      ? 'bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
      : accuracy.percent >= 60
      ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
      : 'bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
    
    // Get additional context
    const getContext = () => {
      if (accuracy.percent >= 90) return 'Excellent - Ready for production use';
      if (accuracy.percent >= 80) return 'Good - Suitable for planning decisions';
      if (accuracy.percent >= 70) return 'Acceptable - Use with caution';
      return 'Needs improvement - Collect more data';
    };
    
    return {
      percent: accuracy.percent.toFixed(2),
      level: accuracy.level,
      colorClass,
      source: accuracy.source || 'Training Set',
      context: getContext(),
      mape: accuracy.mape.toFixed(2)
    };
  };

  const accuracyDisplay = getAccuracyDisplay();

  return (
    <div className="mt-8 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Predictive Analytics</h3>
                {accuracyLoading ? (
                  <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    Loading model accuracy...
                  </span>
                ) : accuracyDisplay ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border ${accuracyDisplay.colorClass}`} title={`MAPE: ${accuracyDisplay.mape}% | ${accuracyDisplay.context}`}>
                      <span className="text-xs font-semibold">
                        Model Accuracy: {accuracyDisplay.percent}% ({accuracyDisplay.source})
                      </span>
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                      • {accuracyDisplay.context}
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Uses the SARIMA algorithm to forecast future trends based on historical and current data, providing insights on risks, traffic patterns, and vehicle registrations.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly Predictions Chart */}
      <div className="p-6">
        <WeeklyPredictionsChart />
      </div>
    </div>
  );
}
