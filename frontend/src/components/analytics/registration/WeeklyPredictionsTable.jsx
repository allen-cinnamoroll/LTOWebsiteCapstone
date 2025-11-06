import React, { useState, useEffect } from 'react';
import { getWeeklyPredictions } from '../../../api/predictionApi.js';
import { FileText, Calendar } from 'lucide-react';

const WeeklyPredictionsTable = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeksToPredict, setWeeksToPredict] = useState(4);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getWeeklyPredictions(weeksToPredict);
        
        if (response.success && response.data?.weekly_predictions) {
          const processed = response.data.weekly_predictions.map((prediction, index) => {
            const date = new Date(prediction.date || prediction.week_start);
            return {
              week: index + 1,
              date: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric' 
              }),
              predicted: prediction.predicted_count || prediction.predicted || prediction.total_predicted || 0,
              lowerBound: prediction.lower_bound || 0,
              upperBound: prediction.upper_bound || 0,
            };
          });
          setWeeklyData(processed);
        } else {
          setError(response.error || 'Failed to fetch prediction data');
        }
      } catch (err) {
        console.error('Error fetching weekly predictions:', err);
        setError('Error loading predictions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [weeksToPredict]);

  return (
    <div className="bg-white/80 dark:bg-gray-800/50 border border-blue-200/50 dark:border-blue-700/50 rounded-xl shadow-sm backdrop-blur-sm">
      <div className="p-4 border-b border-blue-200/50 dark:border-blue-700/50">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Weekly Predictions
          </h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Detailed weekly forecast data
        </p>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        ) : weeklyData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Week
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Predicted
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Range
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {weeklyData.map((row, index) => (
                  <tr 
                    key={index}
                    className="hover:bg-blue-50/50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="py-2 px-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Week {row.week}
                    </td>
                    <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {row.date}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                      {row.predicted.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      {row.lowerBound.toLocaleString()} - {row.upperBound.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyPredictionsTable;

