import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import OTPVerificationModal from "@/components/otp/OTPVerificationModal";
import apiClient from "@/api/axios";

const AuthContext = createContext();

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
    const token = localStorage.getItem("token");
    const userData = JSON.parse(localStorage.getItem("userData"));
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
          setToken(token);
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
    }
    setIsLoading(false); // Set loading to false after checking auth state
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

  // If loading, do not render children yet
  if (isLoading) {
    return <div className="h-screen my-auto mx-auto"></div>;
  }

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated, login, logout, updateToken, userData, setUserData }}
    >
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

export const useAuth = () => useContext(AuthContext);
