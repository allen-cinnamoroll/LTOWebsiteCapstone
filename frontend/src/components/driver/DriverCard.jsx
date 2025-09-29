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
import { createCategoryMap } from "@/util/helper";
import { formatSimpleDate } from "@/util/dateFormatter";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import ConfirmationDIalog from "../dialog/ConfirmationDIalog";

const sexMap = createCategoryMap({
  0: "Male",
  1: "Female",
});

const civilStatusMap = createCategoryMap({
  0: "Single",
  1: "Married",
  3: "Divorced",
});

const DriverCard = () => {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const { token } = auth || {};
  const [driverData, setDriverData] = useState();
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setIsSubmitting] = useState(false);  
  const location = useLocation();

  const navigate = useNavigate();
  const fetchDriver = async () => {
    try {
      const { data } = await apiClient.get(`/driver/${params.id}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data) {
        setDriverData(data.data);
      }
    } catch (error) {
      const statusCode = error.response.status;

      if (statusCode) {
        navigate("/404");
      }
    }
  };
  useEffect(() => {
    fetchDriver();
  }, []);

  const handleDeactivate = () => {
    setShowAlert(true);
  };

  const confirmDelete = () => {
    onDelete(false); // Call the delete function
    setShowAlert(false); // Close the alert dialog after deleting
  };

  const cancelDelete = () => {
    setShowAlert(false); // Close the alert dialog without deleting
  };

  const onDelete = async (data) => {
    const driverId = params.id;
    setIsSubmitting(true); // Ensure UI shows loading state

    const promise = async () => {
      try {
        const response = await apiClient.patch(
          `/driver/${driverId}`,
          {
            isActive: data,
          },
          {
            headers: {
              Authorization: token,
            },
          }
        );

        return response.data; // Resolve with data for toast success message
      } catch (error) {
        const message = error.response?.data?.message || "An error occurred";
        throw new Error(message); // Reject with error for toast error message
      } finally {
        setIsSubmitting(false);
        navigate(-1);
      }
    };

    toast.promise(promise(), {
      loading: "Loading...",
      success: `Driver updated successfully`,
      error: (error) => error.message || "Failed to update driver",
    });
  };

  return (
    <>
      <Card className="lg:col-span-2 row-span-2 border md:shadow-none">
        <CardHeader className="border-b">
          <CardTitle className="text-3xl font-bold">
            {driverData?.fullname}
          </CardTitle>
          <CardDescription>{driverData?.plateNo}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 text-sm gap-4 mb-2">
            <h2 className="text-muted-foreground ">Plate No.:</h2>
            <p className="font-semibold w-full">
              {driverData?.plateNo}
            </p>
            <h2 className="text-muted-foreground ">Owner/Representative Name:</h2>
            <p className="font-semibold w-full">
              {driverData?.ownerRepresentativeName}
            </p>
            <h2 className="text-muted-foreground ">Date of Birth:</h2>
            <p className="font-semibold w-full">
              {driverData?.birthDate ? formatSimpleDate(driverData.birthDate) : "None"}
            </p>
            <h2 className="text-muted-foreground ">Contact Number:</h2>
            <p className="font-semibold w-full">
              {driverData?.contactNumber || "None"}
            </p>
            <h2 className="text-muted-foreground ">Email Address:</h2>
            <p className="font-semibold w-full">{driverData?.emailAddress || "None"}</p>
            <h2 className="text-muted-foreground ">Has Driver's License:</h2>
            <p className="font-semibold w-full">
              {driverData?.hasDriversLicense ? "Yes" : "No"}
            </p>
            <h2 className="text-muted-foreground ">Driver's License Number:</h2>
            <p className="font-semibold w-full">
              {driverData?.driversLicenseNumber || "N/A"}
            </p>
            <h2 className="text-muted-foreground ">Purok:</h2>
            <p className="font-semibold w-full">
              {driverData?.address?.purok || "N/A"}
            </p>
            <h2 className="text-muted-foreground ">Barangay:</h2>
            <p className="font-semibold w-full">
              {driverData?.address?.barangay}
            </p>
            <h2 className="text-muted-foreground ">Municipality:</h2>
            <p className="font-semibold w-full">
              {driverData?.address?.municipality}
            </p>
            <h2 className="text-muted-foreground ">Province:</h2>
            <p className="font-semibold w-full">
              {driverData?.address?.province}
            </p>
            <h2 className="text-muted-foreground ">Region:</h2>
            <p className="font-semibold w-full">
              {driverData?.address?.region}
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
          <Button
            className="font-semibold border border-destructive bg-red-100 text-destructive hover:bg-red-200/70 dark:bg-red-300 dark:hover:bg-red-300/80"
            onClick={handleDeactivate}
          >
            <Trash />
            Deactivate
          </Button>
        </CardFooter>
      </Card>
      {/* shows delete confirmation dialog */}
      <ConfirmationDIalog
        open={showAlert}
        onOpenChange={setShowAlert}
        cancel={cancelDelete}
        confirm={confirmDelete}
        title={"Are you sure?"}
        description={
          " This action cannot be undone. This will deactivate the driver"
        }
      />
    </>
  );
};

export default DriverCard;
