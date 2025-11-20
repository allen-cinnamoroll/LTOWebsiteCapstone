import React, { useEffect, useState } from "react";
import { WifiOff, Shield, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const NetworkRestrictedPage = () => {
  const [clientIP, setClientIP] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Try to get client IP from error response if available
  useEffect(() => {
    const errorData = sessionStorage.getItem('networkError');
    if (errorData) {
      try {
        const parsed = JSON.parse(errorData);
        setClientIP(parsed.clientIP);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    // Wait a moment before reloading to show feedback
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-red-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border-4 border-red-500 dark:border-red-600">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
                <WifiOff className="w-16 h-16" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
              Access Denied
            </h1>
            <p className="text-center text-red-100 text-lg">
              Network Restriction in Effect
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Main Message */}
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Unable to Connect
                  </h3>
                  <p className="text-red-800 dark:text-red-200 text-sm leading-relaxed">
                    This system can only be accessed from authorized networks. 
                    Your current network connection is not permitted to access this system.
                  </p>
                </div>
              </div>
            </div>

            {/* Information Section */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Security Measure
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This restriction is in place to protect sensitive data and ensure 
                    the system is only accessible from designated locations.
                  </p>
                </div>
              </div>

              {clientIP && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your IP Address:</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{clientIP}</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                To Access This System:
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>Connect to the authorized WiFi network</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>Ensure you are within the designated location</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>Contact the system administrator if you need access from a different location</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Connection
                  </>
                )}
              </Button>
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="flex-1"
              >
                Go Back
              </Button>
            </div>

            {/* Contact Info */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need help? Contact your system administrator
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="mt-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Error Code: <span className="font-mono">IP_NOT_WHITELISTED</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NetworkRestrictedPage;

