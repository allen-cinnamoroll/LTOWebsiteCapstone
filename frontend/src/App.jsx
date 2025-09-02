import React from "react";
import { Toaster } from "@/components/ui/sonner"
import MainLayout from "./layout/MainLayout";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProtectedRoutes from "./auth/ProtectedRoutes";
import DashboardLayout from "./layout/DashboardLayout";
import DriverPage from "./pages/DriverPage";
import AddDriverForm from "./pages/AddDriverForm";
import DriverProfile from "./pages/DriverProfile";
import PageNotFound from "./pages/PageNotFound";
import EditDriverForm from "./pages/EditDriverForm";
import DeactivatedDriversPage from "./pages/DeactivatedDriversPage";
import VehiclesPage from "./pages/VehiclesPage";
import AddVehicleForm from "./pages/AddVehicleForm";
import VehicleProfile from "./pages/VehicleProfile";
import EditVehicleForm from "./pages/EditVehicleForm";
import ViolationPage from "./pages/ViolationPage";
import AccidentPage from "./pages/AccidentPage";
import AddAccidentForm from "./pages/AddAccidentForm";
import AccidentProfile from "./pages/AccidentProfile";
import EditAccidentForm from "./pages/EditAccidentForm";
import AddViolationForm from "./pages/AddViolationForm";
import ViolationProfile from "./pages/ViolationProfile";
import EditViolationForm from "./pages/EditViolationForm";
import RegistrationAnalyticsPage from "./pages/RegistrationAnalyticsPage";
import ViolationAnalyticsPage from "./pages/ViolationAnalyticsPage";
import AccidentAnalyticsPage from "./pages/AccidentAnalyticsPage";

function App() {
  return (
    <>
      <Toaster closeButton/>
      <Routes>
        <Route path="/">
          <Route path="/" element={<MainLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/404" element={<PageNotFound/>} />
          </Route>
          <Route
            path="/"
            element={
              <ProtectedRoutes
                allowedRoles={["superadmin", "admin"]}
              />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route index element={<HomePage />} />

              {/* driver routes */}
              <Route path="/driver" element={<DriverPage />} />
              <Route path="/driver/inactive" element={<DeactivatedDriversPage />} />
              <Route path="/driver/create" element={<AddDriverForm />} />
              <Route path="/driver/:id" element={<DriverProfile />} />
              <Route path="/driver/:id/edit" element={<EditDriverForm />} />


              {/* vehicle routes */}
              <Route path="/vehicle" element={<VehiclesPage />} />
              <Route path="/vehicle/create" element={<AddVehicleForm/>}/>
              <Route path="/vehicle/:id" element={<VehicleProfile />} />
              <Route path="/vehicle/:id/edit" element={<EditVehicleForm />} />

              {/* violation routes */}
              <Route path="/violation" element={<ViolationPage />} />
              <Route path="/violation/create" element={<AddViolationForm />} />
              <Route path="/violation/:id" element={<ViolationProfile />} />
              <Route path="/violation/:id/edit" element={<EditViolationForm />} />

              {/* accident routes */}
              <Route path="/accident" element={<AccidentPage />} />
              <Route path="/accident/create" element={<AddAccidentForm />} />
              <Route path="/accident/:id" element={<AccidentProfile />} />
              <Route path="/accident/:id/edit" element={<EditAccidentForm />} />

              {/* analytics routes */}
              <Route path="/analytics/registration" element={<RegistrationAnalyticsPage />} />
              <Route path="/analytics/violation" element={<ViolationAnalyticsPage />} />
              <Route path="/analytics/accident" element={<AccidentAnalyticsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </>
  );
}
export default App;
