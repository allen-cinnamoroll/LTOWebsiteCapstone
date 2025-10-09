import React, { useState } from 'react';
import { AlertTriangle, FileText, TrendingUp, Users, Clock, Shield, ChevronLeft, ChevronRight } from 'lucide-react';

export function ViolationCombinations({ displayData, loading, getCombinationRecommendation }) {
  const [activeTab, setActiveTab] = useState('combinations');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  if (loading) {
    return (
      <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="overflow-hidden">
            <div className="bg-gray-200 dark:bg-gray-700 rounded h-8 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const violationCombinations = displayData?.violationCombinations || [];
  const violationPatterns = displayData?.violationPatterns || [];

  // Pagination logic
  const totalItems = activeTab === 'combinations' ? violationCombinations.length : violationPatterns.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  const currentCombinations = violationCombinations.slice(startIndex, endIndex);
  const currentPatterns = violationPatterns.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Reset page when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getSeverityColor = (count) => {
    if (count >= 50) return 'text-white bg-red-500 shadow-lg shadow-red-500/30 border-2 border-red-400';
    if (count >= 20) return 'text-white bg-orange-500 shadow-lg shadow-orange-500/30 border-2 border-orange-400';
    return 'text-white bg-yellow-500 shadow-lg shadow-yellow-500/30 border-2 border-yellow-400';
  };

  const getSeverityIcon = (count) => {
    if (count >= 50) return <AlertTriangle className="w-4 h-4" />;
    if (count >= 20) return <TrendingUp className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="bg-white dark:bg-black border-2 border-blue-200 dark:border-blue-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-800 dark:to-indigo-800 px-6 py-4 border-b-2 border-blue-300 dark:border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Violation Analysis
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Combinations & Recommended Actions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
             <button
               onClick={() => handleTabChange('combinations')}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                 activeTab === 'combinations'
                   ? 'bg-blue-500 text-white shadow-sm'
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
               }`}
             >
               <FileText className="w-4 h-4 inline mr-1" />
               Combinations
             </button>
             <button
               onClick={() => handleTabChange('patterns')}
               className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                 activeTab === 'patterns'
                   ? 'bg-blue-500 text-white shadow-sm'
                   : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
               }`}
             >
               <TrendingUp className="w-4 h-4 inline mr-1" />
               Patterns
             </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {violationCombinations.length > 0 || violationPatterns.length > 0 ? (
          <div className="space-y-4">
            {activeTab === 'combinations' && (
              <>
                 {/* Table Header */}
                 <div className="bg-blue-100 dark:bg-blue-800/30 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Violation Types</div>
                    <div className="col-span-2">Occurrences</div>
                    <div className="col-span-2">Severity</div>
                    <div className="col-span-3">Recommended Action</div>
                  </div>
                </div>

                 {/* Table Rows */}
                 {currentCombinations.map((combination, index) => {
                  const violations = combination.violations || [];
                  const count = combination.count || 0;
                  const recommendation = getCombinationRecommendation(violations);
                  const globalIndex = startIndex + index + 1;

                  return (
                     <div key={index} className="bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Index */}
                        <div className="col-span-1">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                              {globalIndex}
                            </span>
                          </div>
                        </div>

                        {/* Violation Types */}
                        <div className="col-span-4">
                          <div className="flex flex-wrap gap-1">
                            {violations.map((violation, vIndex) => (
                              <span
                                key={vIndex}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800"
                              >
                                {violation}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Occurrences */}
                        <div className="col-span-2">
                           <div className="flex items-center space-x-2">
                             <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                             <span className="font-semibold text-gray-900 dark:text-white">
                               {count.toLocaleString()}
                             </span>
                           </div>
                        </div>

                        {/* Severity */}
                        <div className="col-span-2">
                           <div className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold ${getSeverityColor(count)} transform hover:scale-105 transition-all duration-200`}>
                            {getSeverityIcon(count)}
                            <span>
                              {count >= 50 ? 'High' : count >= 20 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                        </div>

                        {/* Recommended Action */}
                        <div className="col-span-3">
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">
                              Action Required:
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                              {recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'patterns' && (
              <>
                 {/* Patterns Table Header */}
                 <div className="bg-blue-100 dark:bg-blue-800/30 rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Pattern Name</div>
                    <div className="col-span-2">Frequency</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">Analysis</div>
                  </div>
                </div>

                 {/* Patterns Table Rows */}
                 {currentPatterns.map((pattern, index) => {
                  const patternName = pattern.pattern || 'Unknown Pattern';
                  const frequency = pattern.frequency || 0;
                  const description = pattern.description || 'No description available';
                  const globalIndex = startIndex + index + 1;

                  return (
                     <div key={`pattern-${index}`} className="bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Index */}
                        <div className="col-span-1">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                              {globalIndex}
                            </span>
                          </div>
                        </div>

                        {/* Pattern Name */}
                        <div className="col-span-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {patternName}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {description}
                          </p>
                        </div>

                        {/* Frequency */}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {frequency.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                            frequency >= 30 ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' :
                            frequency >= 15 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            <span>
                              {frequency >= 30 ? 'Active' : frequency >= 15 ? 'Moderate' : 'Low'}
                            </span>
                          </div>
                        </div>

                        {/* Analysis */}
                        <div className="col-span-3">
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
                            <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium mb-1">
                              Pattern Analysis:
                            </p>
                            <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
                              Recurring violation behaviors requiring targeted enforcement strategies.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center pt-4 space-x-4">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-500">
                    ({totalItems} total items)
                  </span>
                </div>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No violation combination data found for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
