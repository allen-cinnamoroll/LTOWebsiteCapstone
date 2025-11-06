import React, { useState, useEffect } from 'react';
import { getWeeklyPredictions } from '../../../api/predictionApi.js';
import { Activity, TrendingUp, BarChart3 } from 'lucide-react';

const TrackerModelsTable = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getWeeklyPredictions(4);
        
        if (response.success && response.data) {
          // Extract model information if available
          const info = {
            modelType: response.data.model_type || 'SARIMA',
            lastTrained: response.data.last_trained || 'N/A',
            accuracy: response.data.accuracy || response.data.mape || 'N/A',
            dataPoints: response.data.total_data_points || response.data.weekly_predictions?.length || 0,
            forecastPeriod: response.data.forecast_period || '4 weeks',
            status: response.data.status || 'Active'
          };
          setModelInfo(info);
        } else {
          // Default model info if API doesn't provide it
          setModelInfo({
            modelType: 'SARIMA',
            lastTrained: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            accuracy: 'N/A',
            dataPoints: 0,
            forecastPeriod: '4 weeks',
            status: 'Active'
          });
        }
      } catch (err) {
        console.error('Error fetching model info:', err);
        setError('Error loading model information');
        // Set default values on error
        setModelInfo({
          modelType: 'SARIMA',
          lastTrained: 'N/A',
          accuracy: 'N/A',
          dataPoints: 0,
          forecastPeriod: '4 weeks',
          status: 'Active'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModelInfo();
  }, []);

  const modelRows = [
    { label: 'Model Type', value: modelInfo?.modelType || 'SARIMA', icon: BarChart3 },
    { label: 'Last Trained', value: modelInfo?.lastTrained || 'N/A', icon: Activity },
    { label: 'Accuracy (MAPE)', value: modelInfo?.accuracy !== 'N/A' ? `${modelInfo.accuracy}%` : 'N/A', icon: TrendingUp },
    { label: 'Data Points', value: modelInfo?.dataPoints?.toLocaleString() || '0', icon: BarChart3 },
    { label: 'Forecast Period', value: modelInfo?.forecastPeriod || '4 weeks', icon: Activity },
    { label: 'Status', value: modelInfo?.status || 'Active', icon: Activity }
  ];

  return (
    <div className="bg-white/80 dark:bg-gray-800/50 border border-blue-200/50 dark:border-blue-700/50 rounded-xl shadow-sm backdrop-blur-sm">
      <div className="p-4 border-b border-blue-200/50 dark:border-blue-700/50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Tracker Models
          </h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Model performance and configuration
        </p>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        ) : (
          <div className="space-y-3">
            {modelRows.map((row, index) => {
              const IconComponent = row.icon;
              return (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {row.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {row.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackerModelsTable;

