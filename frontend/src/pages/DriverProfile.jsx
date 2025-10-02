import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DriverChart } from "@/components/driver/DriverChart";
import { ArrowLeft, User } from "lucide-react";

import DriverModal from "@/components/driver/DriverModal";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

const DriverProfile = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
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

  return (
    <>
      <div className="px-4 pt-4 md:px-0 md:pt-0 md:mb-4">
        <Button
          variant="outline"
          className="shadow-none"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft /> Back
        </Button>
      </div>
      
      <div className="p-4 md:p-0">
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Driver Profile</h2>
          <p className="text-gray-500 mb-6">Click the button below to view driver information</p>
          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <User className="h-4 w-4 mr-2" />
            View Driver Information
          </Button>
        </div>
      </div>

      <DriverModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        driverData={driverData}
      />
    </>
  );
};

export default DriverProfile;
