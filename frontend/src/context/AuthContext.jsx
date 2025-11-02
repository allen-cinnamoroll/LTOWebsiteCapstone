import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import OTPVerificationModal from "@/components/otp/OTPVerificationModal";
import apiClient from "@/api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [showOTPModal, setShowOTPModal] = useState(false);
  const navigate = useNavigate();
  const isNavigating = useRef(false); // Track navigation state

  // Helper function to check if the token is expired
  const isTokenExpired = (decodedToken) => {
    return decodedToken.exp * 1000 < Date.now();
  };

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem("token");
        const userDataStr = localStorage.getItem("userData");
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        
        if (token) {
          try {
            const decoded = jwtDecode(token);
            if (isTokenExpired(decoded)) {
              // Clear expired token without navigation
              localStorage.removeItem("token");
              localStorage.removeItem("userData");
              setToken(null);
              setUserData(null);
              setIsAuthenticated(false);
            } else {
              // Token is not expired, use local validation for now
              // TODO: Add backend validation when the endpoint is available
              setToken(token);
              
              // Ensure avatar URL is properly constructed
              if (userData && userData.avatar && !userData.avatar.startsWith('http')) {
                const baseURL = import.meta.env.VITE_BASE_URL || 'http://72.60.198.244:5000/api';
                const backendURL = baseURL.replace('/api', '');
                userData.avatar = `${backendURL}/${userData.avatar}`;
              }
              
              setUserData(userData);
              setIsAuthenticated(true);
            }
          } catch (error) {
            // Clear invalid token without navigation
            localStorage.removeItem("token");
            localStorage.removeItem("userData");
            setToken(null);
            setUserData(null);
            setIsAuthenticated(false);
          }
        } else {
          // No token, user is not authenticated
          setToken(null);
          setUserData(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Handle any errors during initialization
        console.error("Auth initialization error:", error);
        setToken(null);
        setUserData(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false); // Always set loading to false
      }
    };

    initializeAuth();
  }, []);

  const login = (newToken) => {
    const decoded = jwtDecode(newToken);
    if (isTokenExpired(decoded)) {
      // Clear expired token without navigation
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      setToken(null);
      setUserData(null);
      setIsAuthenticated(false);
      return;
    }
    const userData = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      firstName: decoded.firstName,
      middleName: decoded.middleName,
      lastName: decoded.lastName,
      avatar: decoded.avatar ? (() => {
        const baseURL = import.meta.env.VITE_BASE_URL || 'http://72.60.198.244:5000/api';
        const backendURL = baseURL.replace('/api', '');
        return `${backendURL}/${decoded.avatar}`;
      })() : '',
      isPasswordChange: decoded.isPasswordChange,
      isOtpVerified: decoded.isOtpVerified
    };
    localStorage.setItem("token", newToken);
    localStorage.setItem("userData", JSON.stringify(userData));
    
    setToken(newToken);
    setUserData(userData);
    setIsAuthenticated(true);
    
  };

  const updateToken = (newToken) => {
    const decoded = jwtDecode(newToken);
    
    if (isTokenExpired(decoded)) {
      // Clear expired token without navigation
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      setToken(null);
      setUserData(null);
      setIsAuthenticated(false);
      return;
    }
    const userData = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      firstName: decoded.firstName,
      middleName: decoded.middleName,
      lastName: decoded.lastName,
      avatar: decoded.avatar ? (() => {
        const baseURL = import.meta.env.VITE_BASE_URL || 'http://72.60.198.244:5000/api';
        const backendURL = baseURL.replace('/api', '');
        return `${backendURL}/${decoded.avatar}`;
      })() : '',
      isPasswordChange: decoded.isPasswordChange,
      isOtpVerified: decoded.isOtpVerified
    };
    
    
    localStorage.setItem("token", newToken);
    localStorage.setItem("userData", JSON.stringify(userData));
    
    setToken(newToken);
    setUserData(userData);
    setIsAuthenticated(true); // Make sure to set authenticated to true
  };

  // Check if OTP verification is required for non-superadmin users
  useEffect(() => {
    if (isAuthenticated && userData?.role && userData.role !== "0" && userData.isOtpVerified === false) {
      setShowOTPModal(true);
    } else {
      setShowOTPModal(false);
    }
  }, [isAuthenticated, userData]);

  // Handle OTP verification success
  const handleOTPSuccess = (newToken) => {
    updateToken(newToken);
    // Navigate to home page after successful OTP verification
    // Use a small delay to ensure state is updated
    setTimeout(() => {
      if (!isNavigating.current) {
        isNavigating.current = true;
        navigate("/");
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      }
    }, 100);
    // Modal will be closed by the useEffect when isOtpVerified becomes true
  };

  // Handle OTP modal close
  const handleOTPClose = () => {
    setShowOTPModal(false);
    logout(); // Logout user if they close the OTP modal
  };

  const logout = async () => {
    try {
      // Call backend logout API to log the activity
      await apiClient.post("/auth/logout");
    } catch (error) {
      // Even if the API call fails, we should still clear local state
      console.error("Logout API call failed:", error);
    } finally {
      // Always clear local state regardless of API call result
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
      setToken(null);
      setUserData(null);
      setIsAuthenticated(false);
      
      // Prevent multiple navigation calls
      if (!isNavigating.current) {
        isNavigating.current = true;
        navigate("/login");
        // Reset navigation flag after a short delay
        setTimeout(() => {
          isNavigating.current = false;
        }, 100);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      try {
        const decoded = jwtDecode(token);
        const timeout = decoded.exp * 1000 - Date.now();
        
        // Only set timer if timeout is positive
        if (timeout > 0) {
          const logoutTimer = setTimeout(() => {
            // Clear state without navigation to prevent loops
            localStorage.removeItem("token");
            localStorage.removeItem("userData");
            setToken(null);
            setUserData(null);
            setIsAuthenticated(false);
            
            // Only navigate if not already navigating
            if (!isNavigating.current) {
              isNavigating.current = true;
              navigate("/login");
              setTimeout(() => {
                isNavigating.current = false;
              }, 100);
            }
          }, timeout);

          return () => clearTimeout(logoutTimer);
        } else {
          // Token is already expired, clear state without navigation
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
          setToken(null);
          setUserData(null);
          setIsAuthenticated(false);
          
          // Only navigate if not already navigating
          if (!isNavigating.current) {
            isNavigating.current = true;
            navigate("/login");
            setTimeout(() => {
              isNavigating.current = false;
            }, 100);
          }
        }
      } catch (error) {
        // If token decoding fails, clear state
        localStorage.removeItem("token");
        localStorage.removeItem("userData");
        setToken(null);
        setUserData(null);
        setIsAuthenticated(false);
      }
    }
  }, [token]); // Only depend on token, not isAuthenticated to prevent loops

  // If loading, show loading spinner
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  const contextValue = {
    token,
    isAuthenticated,
    login,
    logout,
    updateToken,
    userData,
    setUserData
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {/* Global OTP Modal */}
      <OTPVerificationModal
        isOpen={showOTPModal}
        onClose={handleOTPClose}
        onSuccess={handleOTPSuccess}
        userEmail={userData?.email}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
