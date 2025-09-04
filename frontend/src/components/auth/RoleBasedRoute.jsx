import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const RoleBasedRoute = ({ allowedRoles, children }) => {
  const { userData } = useAuth();
  const location = useLocation();
  const userRole = userData?.role;

  const roleMapping = {
    employee: "2",
    admin: "1", 
    superadmin: "0",
  };

  // Map allowed roles to their corresponding values
  const mappedAllowedRoles = allowedRoles.map((role) => roleMapping[role]);

  // Check if the user has the required role
  if (mappedAllowedRoles.includes(userRole)) {
    return children;
  }

  // If user doesn't have required role, redirect to dashboard
  return <Navigate to="/" state={{ from: location }} replace />;
};

export default RoleBasedRoute;
