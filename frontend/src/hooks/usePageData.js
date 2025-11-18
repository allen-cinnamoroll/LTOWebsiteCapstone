import { useState, useEffect, useRef } from "react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

/**
 * usePageData - Custom hook for parallel data fetching with caching
 * 
 * Features:
 * - Fetches multiple endpoints in parallel using Promise.all
 * - Simple in-memory cache with configurable TTL
 * - Returns loading states per data section
 * - Handles errors gracefully
 * 
 * @param {Object} config - Configuration object
 * @param {Object} config.endpoints - Object mapping keys to endpoint configs
 * @param {number} config.cacheTime - Cache TTL in milliseconds (default: 5 minutes)
 * @param {boolean} config.enabled - Whether to fetch immediately (default: true)
 * 
 * @returns {Object} - { data, isLoading, isError, errors, refetch }
 * 
 * Example:
 * const { data, isLoading } = usePageData({
 *   endpoints: {
 *     stats: { url: '/dashboard/stats' },
 *     charts: { url: '/dashboard/charts' }
 *   },
 *   cacheTime: 300000 // 5 minutes
 * });
 */
const cache = new Map();

const usePageData = ({ endpoints, cacheTime = 300000, enabled = true }) => {
  const { token } = useAuth();
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const [isError, setIsError] = useState({});
  const [errors, setErrors] = useState({});
  const cacheKeyRef = useRef(null);

  // Generate cache key from endpoints
  const getCacheKey = () => {
    return JSON.stringify(
      Object.keys(endpoints).sort().map(key => ({
        key,
        url: endpoints[key].url,
        params: endpoints[key].params || {}
      }))
    );
  };

  const fetchData = async (forceRefresh = false) => {
    if (!enabled) return;

    const cacheKey = getCacheKey();
    cacheKeyRef.current = cacheKey;

    // Check cache first (unless force refresh)
    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        // Set all loading states to false
        const initialLoading = {};
        const initialError = {};
        Object.keys(endpoints).forEach(key => {
          initialLoading[key] = false;
          initialError[key] = false;
        });
        setIsLoading(initialLoading);
        setIsError(initialError);
        return;
      } else {
        // Cache expired, remove it
        cache.delete(cacheKey);
      }
    }

    // Initialize loading and error states
    const initialLoading = {};
    const initialError = {};
    const initialErrors = {};
    Object.keys(endpoints).forEach(key => {
      initialLoading[key] = true;
      initialError[key] = false;
      initialErrors[key] = null;
    });
    setIsLoading(initialLoading);
    setIsError(initialError);
    setErrors(initialErrors);

    // Fetch all endpoints in parallel
    const promises = Object.keys(endpoints).map(async (key) => {
      const endpoint = endpoints[key];
      try {
        const response = await apiClient.get(endpoint.url, {
          headers: { Authorization: token },
          params: endpoint.params || {}
        });
        return { key, data: response.data, error: null };
      } catch (error) {
        console.error(`Error fetching ${key}:`, error);
        return { 
          key, 
          data: null, 
          error: error.response?.data?.message || error.message || 'Unknown error'
        };
      }
    });

    try {
      const results = await Promise.all(promises);
      
      // Process results
      const newData = {};
      const newErrors = {};
      const newIsError = {};
      const newIsLoading = {};

      results.forEach(({ key, data: resultData, error }) => {
        if (error) {
          newIsError[key] = true;
          newErrors[key] = error;
          newData[key] = null;
        } else {
          newIsError[key] = false;
          newErrors[key] = null;
          newData[key] = resultData;
        }
        newIsLoading[key] = false;
      });

      setData(newData);
      setIsError(newIsError);
      setErrors(newErrors);
      setIsLoading(newIsLoading);

      // Cache the results
      cache.set(cacheKey, {
        data: newData,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Error in parallel fetch:", error);
      // Set all to error state
      const errorState = {};
      Object.keys(endpoints).forEach(key => {
        errorState[key] = true;
      });
      setIsError(errorState);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, token, JSON.stringify(endpoints)]);

  // Refetch function
  const refetch = () => {
    fetchData(true);
  };

  // Check if any section is loading
  const anyLoading = Object.values(isLoading).some(loading => loading === true);
  
  // Check if any section has error
  const anyError = Object.values(isError).some(error => error === true);

  return {
    data,
    isLoading,
    isError,
    errors,
    anyLoading,
    anyError,
    refetch
  };
};

export default usePageData;

