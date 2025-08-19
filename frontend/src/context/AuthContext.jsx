import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const navigate = useNavigate();

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
          logout();
        } else {
          setToken(token);
          setUserData(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        logout(); // Handle cases where token decoding fails
      }
    }
    setIsLoading(false); // Set loading to false after checking auth state
  }, []);

  const login = (newToken) => {
    const decoded = jwtDecode(newToken);
    if (isTokenExpired(decoded)) {
      logout();
      return;
    }
    const userData = {
      userId: decoded.userId,
      role: decoded.role,
      username: decoded.username,
      email: decoded.email,
      isPasswordChange: decoded.isPasswordChange
    };
    localStorage.setItem("token", newToken);
    localStorage.setItem("userData", JSON.stringify(userData));
    
    setToken(newToken);
    setUserData(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    setToken(null);
    setUserData(null);
    setIsAuthenticated(false);
    navigate("/login");
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      const decoded = jwtDecode(token);
      const timeout = decoded.exp * 1000 - Date.now();
      const logoutTimer = setTimeout(logout, timeout);

      return () => clearTimeout(logoutTimer);
    }
  }, [token, isAuthenticated]);

  // If loading, do not render children yet
  if (isLoading) {
    return <div className="h-screen my-auto mx-auto"></div>;
  }

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated, login, logout, userData, setUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
