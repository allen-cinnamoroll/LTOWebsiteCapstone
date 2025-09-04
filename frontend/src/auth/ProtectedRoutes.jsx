import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ProtectedRoutes = ({ allowedRoles }) => {
  const roleMapping = {
    employee: "2",
    admin: "1",
    superadmin: "0",
  };
  const { isAuthenticated, isLoading, userData } = useAuth();
  const location = useLocation();
  const userRole = userData?.role;

  // Check if the authentication status is still loading
  if (isLoading) {
    return <div className="h-screen my-auto mx-auto"></div>;
  }

  // Map allowed roles to their corresponding values in roleMapping
  const mappedAllowedRoles = allowedRoles.map((role) => roleMapping[role]);

  // Check if the user is authenticated and has the correct mapped role
  if (isAuthenticated && mappedAllowedRoles.includes(userRole)) {
    return <Outlet />;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoutes;