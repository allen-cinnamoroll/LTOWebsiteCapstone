import React from 'react';

export function FilterControls({
  selectedYear,
  setSelectedYear,
  isYearDropdownOpen,
  setIsYearDropdownOpen,
  years,
  yearDropdownRef,
  handleYearSelect
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Year Filter */}
      <div className="relative" ref={yearDropdownRef}>
        <button
          onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
          className="flex items-center justify-between w-48 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span className="truncate">
            {selectedYear ? `Year ${selectedYear}` : 'All Time'}
          </span>
          <svg
            className={`w-5 h-5 ml-2 transition-transform duration-200 ${
              isYearDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isYearDropdownOpen && (
          <div className="absolute z-10 w-48 mt-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedYear === year
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{year === 'All' ? 'All Time' : `Year ${year}`}</span>
                  {selectedYear === year && (
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Status Indicator */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span>
          {selectedYear && selectedYear !== 'All' 
            ? `Filtered by ${selectedYear}` 
            : 'Showing all data'
          }
        </span>
      </div>

      {/* Clear Filters Button */}
      {selectedYear && selectedYear !== 'All' && (
        <button
          onClick={() => handleYearSelect('All')}
                className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
