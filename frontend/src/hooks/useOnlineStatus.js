import { useState, useEffect } from 'react';

/**
 * Custom hook to detect online/offline status
 * Returns current online status and provides event listeners
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Mark that we're coming back online (were offline before)
      if (!isOnline) {
        setWasOffline(true);
        // Reset the wasOffline flag after a brief moment
        setTimeout(() => setWasOffline(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
};

