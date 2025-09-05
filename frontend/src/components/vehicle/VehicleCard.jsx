import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { capitalizeFirstLetter } from "@/util/helper";


const VehicleCard = () => {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const [vehicleData, setVehicleData] = useState();
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(`/vehicle/${params.id}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data) {
        setVehicleData(data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      toast.error("Failed to load vehicle data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchVehicle();
  }, []);

  if (loading) {
    return (
      <Card className="lg:col-span-2 row-span-2 border md:shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading vehicle data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="lg:col-span-2 row-span-2 border md:shadow-none">
        <CardHeader className="border-b">
          <CardTitle className="text-3xl font-bold">
            {vehicleData?.make
              ? capitalizeFirstLetter(vehicleData.make)
              : "N/A"}
          </CardTitle>
          <CardDescription>
            {vehicleData?.plateNo || "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-6">
          <div className="grid grid-cols-2 text-sm gap-4 mb-2">
            <h1 className="font-bold col-span-2 border-b px-6 py-1">
              Vehicle Information
            </h1>
            <h2 className="text-muted-foreground px-6">Plate Number:</h2>
            <p className="font-semibold w-full">{vehicleData?.plateNo || "N/A"}</p>
            
            <h2 className="text-muted-foreground px-6">File Number:</h2>
            <p className="font-semibold w-full">{vehicleData?.fileNo || "N/A"}</p>
            
            <h2 className="text-muted-foreground px-6">Engine Number:</h2>
            <p className="font-semibold w-full">{vehicleData?.engineNo || "N/A"}</p>
            
            <h2 className="text-muted-foreground px-6">Chassis Number:</h2>
            <p className="font-semibold w-full">{vehicleData?.chassisNo || "N/A"}</p>
            
            <h2 className="text-muted-foreground px-6">Make:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.make
                ? capitalizeFirstLetter(vehicleData.make)
                : "N/A"}
            </p>
            
            <h2 className="text-muted-foreground px-6">Body Type:</h2>
            <p className="font-semibold w-full">{vehicleData?.bodyType || "N/A"}</p>
            
            <h2 className="text-muted-foreground px-6">Color:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.color
                ? capitalizeFirstLetter(vehicleData.color)
                : "N/A"}
            </p>
            
            <h2 className="text-muted-foreground px-6">Classification:</h2>
            <p className="font-semibold w-full">{vehicleData?.classification || "N/A"}</p>
            
            <h2 className="text-muted-foreground px-6">Date of Renewal:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.dateOfRenewal 
                ? formatSimpleDate(vehicleData.dateOfRenewal)
                : "Not set"}
            </p>
            
            <h2 className="text-muted-foreground px-6">Status:</h2>
            <p className="font-semibold w-full">
              <span className={`px-2 py-1 rounded text-xs ${
                vehicleData?.status === "1" || vehicleData?.status === 1
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {vehicleData?.status === "1" || vehicleData?.status === 1 ? "Active" : "Expired"}
              </span>
            </p>
          </div>
        </CardContent>
        <CardFooter className="gap-2 text-sm ">
          <Button
            onClick={() => navigate(`${location.pathname}/edit`)}
            size="sm"
            className="font-semibold"
            variant="outline"
          >
            <Edit />
            Edit
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

export default VehicleCard;
