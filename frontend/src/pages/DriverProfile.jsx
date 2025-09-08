import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DriverChart } from "@/components/driver/DriverChart";
import { ArrowLeft } from "lucide-react";

import DriverLogs from "@/components/driver/DriverLogs";
import DriverCard from "@/components/driver/DriverCard";

const DriverProfile = () => {
  const params = useParams();
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
      <div className="grid lg:grid-cols-3 gap-4  p-4 md:p-0">
        <DriverCard />
        <div className="row-span-2 border rounded-md  overflow-hidden ">
          <DriverChart driverId={params.id} />
        </div>
        <DriverLogs />
      </div>
    </>
  );
};

export default DriverProfile;
