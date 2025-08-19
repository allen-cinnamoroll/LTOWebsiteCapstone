import React, { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/api/axios";

const ProtectedRoutes = ({ allowedRoles }) => {
  const roleMapping = {
    driver:"2",
    admin: "1",
    superadmin: "0",
  };
  const [data, setData] = useState();
  const { isAuthenticated, isLoading, userData, token } = useAuth();
  const location = useLocation();
  const userRole = userData?.role;

  // Check if the authentication status is still loading
  if (isLoading) {
    return <div className="h-screen my-auto mx-auto"></div>;
  }

  // Map allowed roles to their corresponding values in roleMapping
  const mappedAllowedRoles = allowedRoles.map((role) => roleMapping[role]);

  // Check if the user is authenticated and has the correct mapped role
  return isAuthenticated && mappedAllowedRoles.includes(userRole) ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default ProtectedRoutes;