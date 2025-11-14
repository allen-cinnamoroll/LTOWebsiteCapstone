import React, { useState, useEffect } from 'react';
import WeeklyPredictionsChart from './WeeklyPredictionsChart.jsx';
import { getWeeklyPredictions } from '../../../api/predictionApi.js';

export function PredictiveAnalytics() {
  const [confidence, setConfidence] = useState(null);
  const [confidenceLoading, setConfidenceLoading] = useState(true);

  useEffect(() => {
    const fetchConfidence = async () => {
      try {
        setConfidenceLoading(true);
        // Fetch predictions to calculate confidence from intervals
        const response = await getWeeklyPredictions(12, null); // Get 12 weeks, all municipalities
        
        if (response.success && response.data?.weekly_predictions) {
          const predictions = response.data.weekly_predictions;
          
          if (predictions.length > 0) {
            // Calculate average confidence interval width as percentage of prediction
            let totalConfidenceScore = 0;
            let validPredictions = 0;
            
            predictions.forEach(pred => {
              const predicted = pred.predicted_count || pred.predicted || 0;
              const lower = pred.lower_bound || 0;
              const upper = pred.upper_bound || 0;
              
              if (predicted > 0) {
                // Calculate interval width as percentage of prediction
                const intervalWidth = upper - lower;
                const widthPercent = (intervalWidth / predicted) * 100;
                
                // Convert to confidence score: narrower intervals = higher confidence
                // If width is 20% of prediction, confidence is ~80%
                // If width is 100% of prediction, confidence is ~0%
                // Formula: confidence = max(0, 100 - widthPercent)
                const confidenceScore = Math.max(0, Math.min(100, 100 - widthPercent));
                totalConfidenceScore += confidenceScore;
                validPredictions++;
              }
            });
            
            if (validPredictions > 0) {
              const avgConfidence = totalConfidenceScore / validPredictions;
              setConfidence({
                percent: avgConfidence,
                level: avgConfidence >= 80 ? 'High' : avgConfidence >= 60 ? 'Moderate' : 'Low'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching prediction confidence:', error);
      } finally {
        setConfidenceLoading(false);
      }
    };

    fetchConfidence();
  }, []);

  const getConfidenceDisplay = () => {
    if (!confidence) return null;
    
    const colorClass = confidence.percent >= 80 
      ? 'bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
      : confidence.percent >= 60
      ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
      : 'bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
    
    return {
      percent: confidence.percent.toFixed(1),
      level: confidence.level,
      colorClass
    };
  };

  const confidenceDisplay = getConfidenceDisplay();

  return (
    <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-blue-200/50 dark:border-blue-700/50">
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
                {confidenceLoading ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">Loading confidence...</span>
                ) : confidenceDisplay ? (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border ${confidenceDisplay.colorClass}`}>
                      <span className="text-xs font-semibold">
                        Prediction Confidence: {confidenceDisplay.percent}% ({confidenceDisplay.level})
                      </span>
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
