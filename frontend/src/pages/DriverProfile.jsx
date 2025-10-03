import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DriverModal from "@/components/driver/DriverModal";
import VehicleModal from "@/components/vehicle/VehicleModal";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

const DriverProfile = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [selectedFileNumber, setSelectedFileNumber] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    fetchDriver();
  }, []);

  const fetchDriver = async () => {
    try {
      const { data } = await apiClient.get(`/driver/${params.id}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data) {
        setDriverData(data.data);
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching driver:", error);
      navigate("/404");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleFileNumberClick = (fileNumber) => {
    setSelectedFileNumber(fileNumber);
    setVehicleModalOpen(true);
  };

  return (
    <>
      <DriverModal 
        open={modalOpen} 
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            // When modal is closed, navigate back to drivers table
            navigate('/driver');
          }
        }} 
        driverData={driverData}
        onFileNumberClick={handleFileNumberClick}
      />
      
      <VehicleModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        fileNumber={selectedFileNumber}
      />
    </>
  );
};

export default DriverProfile;
