import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DriverChart } from "@/components/driver/DriverChart";
import { ArrowLeft } from "lucide-react";
import VehicleCard from "@/components/vehicle/VehicleCard";

const VehicleProfile = () => {
  const navigate = useNavigate();
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
        <VehicleCard/>
      </div>
    </>
  );
};

export default VehicleProfile;
