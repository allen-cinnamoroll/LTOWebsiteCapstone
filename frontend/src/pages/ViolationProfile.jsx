
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ViolationCard from "@/components/violations/ViolationCard";

const ViolationProfile = () => {
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
        <ViolationCard/>
      </div>
    </>
  );
};

export default ViolationProfile;
