import React from "react";
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "./layout/MainLayout";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProtectedRoutes from "./auth/ProtectedRoutes";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import DashboardLayout from "./layout/DashboardLayout";
import DriverPage from "./pages/DriverPage";
import DriverProfile from "./pages/DriverProfile";
import PageNotFound from "./pages/PageNotFound";
import EditDriverForm from "./pages/EditDriverForm";
import DeactivatedDriversPage from "./pages/DeactivatedDriversPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehicleProfile from "./pages/VehicleProfile";
import EditVehicleForm from "./pages/EditVehicleForm";
import ViolationPage from "./pages/ViolationPage";
import AccidentPage from "./pages/AccidentPage";
import AccidentProfile from "./pages/AccidentProfile";
import EditAccidentForm from "./pages/EditAccidentForm";
import EditViolationForm from "./pages/EditViolationForm";
import RegistrationAnalyticsPage from "./pages/RegistrationAnalyticsPage";
import ViolationAnalyticsPage from "./pages/ViolationAnalyticsPage";
import AccidentAnalyticsPage from "./pages/AccidentAnalyticsPage";
import RegisterAccountPage from "./pages/RegisterAccountPage";
import UpdateAccountPage from "./pages/UpdateAccountPage";
import ViewAccountLogsPage from "./pages/ViewAccountLogsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <>
      <Toaster closeButton/>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/404" element={<PageNotFound/>} />
        
        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoutes
              allowedRoles={["superadmin", "admin", "employee"]}
            />
          }
        >
          <Route element={<DashboardLayout />}>
            {/* Dashboard - accessible to all authenticated users */}
            <Route index element={<HomePage />} />

            {/* Analytics - accessible to all authenticated users */}
            <Route path="analytics/registration" element={<RegistrationAnalyticsPage />} />
            <Route path="analytics/violation" element={<ViolationAnalyticsPage />} />
            <Route path="analytics/accident" element={<AccidentAnalyticsPage />} />

            {/* Driver routes - accessible to all authenticated users */}
            <Route path="driver" element={<DriverPage />} />
            <Route path="driver/inactive" element={<DeactivatedDriversPage />} />
            <Route path="driver/:id" element={<DriverProfile />} />
            <Route path="driver/:id/edit" element={<EditDriverForm />} />

            {/* Vehicle routes - accessible to all authenticated users */}
            <Route path="vehicle" element={<VehiclesPage />} />
            <Route path="vehicle/:id" element={<VehicleProfile />} />
            <Route path="vehicle/:id/edit" element={<EditVehicleForm />} />

            {/* Violation routes - accessible to all authenticated users */}
            <Route path="violation" element={<ViolationPage />} />
            <Route path="violation/:id/edit" element={<EditViolationForm />} />

            {/* Accident routes - accessible to all authenticated users */}
            <Route path="accident" element={<AccidentPage />} />
            <Route path="accident/:id" element={<AccidentProfile />} />
            <Route path="accident/:id/edit" element={<EditAccidentForm />} />

            {/* Account management routes - for admin and superadmin */}
            <Route path="account/register" element={
              <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                <RegisterAccountPage />
              </RoleBasedRoute>
            } />
            <Route path="account/update" element={
              <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                <UpdateAccountPage />
              </RoleBasedRoute>
            } />
            <Route path="account/logs" element={
              <RoleBasedRoute allowedRoles={["admin", "superadmin"]}>
                <ViewAccountLogsPage />
              </RoleBasedRoute>
            } />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </>
  );
}
export default App;
