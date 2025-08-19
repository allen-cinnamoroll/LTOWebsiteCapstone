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
import { createCategoryMap, getFullName } from "@/util/helper";
import { formatSimpleDate } from "@/util/dateFormatter";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { capitalizeFirstLetter } from "@/util/helper";

const classificationMap = createCategoryMap({
  0: "Private",
  1: "For Hire",
  3: "Government",
});

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
      const { data } = await apiClient.get(`/vehicle/${params.id}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data) {
        setVehicleData(data.data);
      }
    } catch (error) {
      const statusCode = error.response.status;

      if (statusCode) {
        // navigate("/404");
      }
    }
  };
  useEffect(() => {
    fetchVehicle();
  }, []);

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
            {vehicleData?.series
              ? capitalizeFirstLetter(vehicleData.series)
              : "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-6">
          <div className="grid grid-cols-2 text-sm gap-4 mb-2">
            <h1 className="font-bold col-span-2 border-b px-6 py-1">
              Owner Information
            </h1>
            <h2 className="text-muted-foreground px-6">Fullname:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.owner
                ? getFullName(
                    vehicleData.owner.firstName,
                    vehicleData.owner.lastName,
                    vehicleData.owner.middleName
                  )
                : "N/A"}
            </p>
            <h2 className="text-muted-foreground px-6">Address:</h2>
            <p className="font-semibold w-full">
              {`${vehicleData?.owner.street}, ${vehicleData?.owner.barangay}, ${vehicleData?.owner.municipality}, ${vehicleData?.owner.province}`}
            </p>
            <h1 className="font-bold col-span-2 border-y px-6 py-1">Documentation</h1>
            <h2 className="text-muted-foreground px-6">Enumbrance:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.encumbrance || "N/A"}
            </p>
            <h2 className="text-muted-foreground px-6">File Number:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.fileNo || "N/A"}
            </p>
            <h2 className="text-muted-foreground px-6">Vehicle Type:</h2>
            <p className="font-semibold w-full">{vehicleData?.vehicleType}</p>
            <h1 className="font-bold col-span-2 border-y px-6 py-1">Identification</h1>

            <h2 className="text-muted-foreground px-6">Plate Number:</h2>
            <p className="font-semibold w-full">{vehicleData?.plateNo}</p>
            <h2 className="text-muted-foreground px-6">Make:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.make
                ? capitalizeFirstLetter(vehicleData.make)
                : "N/A"}
            </p>
            <h2 className="text-muted-foreground px-6">Series:</h2>
            <p className="font-semibold w-full">
              {" "}
              {vehicleData?.series
                ? capitalizeFirstLetter(vehicleData.series)
                : "N/A"}
            </p>
            <h2 className="text-muted-foreground px-6">Classification:</h2>
            <p className="font-semibold w-full">
              {classificationMap.get(vehicleData?.classification)}
            </p>
            <h2 className="text-muted-foreground px-6">Body Type:</h2>
            <p className="font-semibold w-full">{vehicleData?.bodyType}</p>
            <h2 className="text-muted-foreground px-6">Color:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.color
                ? capitalizeFirstLetter(vehicleData.color)
                : "N/A"}
            </p>
            <h2 className="text-muted-foreground px-6">Fuel Type:</h2>
            <p className="font-semibold w-full">{vehicleData?.fuelType}</p>
            <h2 className="text-muted-foreground px-6">Year Model:</h2>
            <p className="font-semibold w-full">{vehicleData?.yearModel}</p>
            <h2 className="text-muted-foreground px-6">Motor Number:</h2>
            <p className="font-semibold w-full">{vehicleData?.motorNumber}</p>
            <h2 className="text-muted-foreground px-6">Serial/Chassis Number:</h2>
            <p className="font-semibold w-full">
              {vehicleData?.serialChassisNumber}
            </p>
            <h2 className="text-muted-foreground px-6">Date Registered:</h2>
            <p className="font-semibold w-full">
              {formatSimpleDate(vehicleData?.dateRegistered)}
            </p>
            <h2 className="text-muted-foreground px-6">Expiration Date:</h2>
            <p className="font-semibold w-full">
              {formatSimpleDate(vehicleData?.expirationDate)}
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
