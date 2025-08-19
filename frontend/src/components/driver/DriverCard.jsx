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
  const { token } = useAuth();
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
          `/driver/${driverId}/updateStatus`,
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
          <CardDescription>{driverData?.licenseNo}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 text-sm gap-4 mb-2">
            <h2 className="text-muted-foreground ">Sex:</h2>
            <p className="font-semibold w-full">
              {sexMap.get(driverData?.sex)}
            </p>
            <h2 className="text-muted-foreground ">Date of Birth:</h2>
            <p className="font-semibold w-full">
              {formatSimpleDate(driverData?.birthDate)}
            </p>
            <h2 className="text-muted-foreground ">Civil Status:</h2>
            <p className="font-semibold w-full">
              {civilStatusMap.get(driverData?.civilStatus)}
            </p>
            <h2 className="text-muted-foreground ">Nationality:</h2>
            <p className="font-semibold w-full">{driverData?.nationality}</p>

            <h2 className="text-muted-foreground ">Street:</h2>
            <p className="font-semibold w-full">
              {driverData?.address?.street}
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
            <h2 className="text-muted-foreground ">Birthplace:</h2>
            <p className="font-semibold w-full">{driverData?.birthPlace}</p>
            <h2 className="text-muted-foreground ">Issue Date:</h2>
            <p className="font-semibold w-full">
              {formatSimpleDate(driverData?.issueDate)}
            </p>
            <h2 className="text-muted-foreground ">Expiry Date:</h2>
            <p className="font-semibold w-full">
              {formatSimpleDate(driverData?.expiryDate)}
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
