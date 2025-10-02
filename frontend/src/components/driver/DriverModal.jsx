import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit, Trash, User, MapPin, Phone, Mail, Calendar, Car, FileText, CreditCard } from "lucide-react";
import { toast } from "sonner";
import ConfirmationDIalog from "../dialog/ConfirmationDIalog";

const DriverModal = ({ open, onOpenChange, driverData }) => {
  const params = useParams();
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setIsSubmitting] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { token } = auth || {};

  const handleDeactivate = () => {
    setShowAlert(true);
  };

  const confirmDelete = () => {
    onDelete(false);
    setShowAlert(false);
  };

  const cancelDelete = () => {
    setShowAlert(false);
  };

  const onDelete = async (data) => {
    const driverId = params.id;
    setIsSubmitting(true);

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

        return response.data;
      } catch (error) {
        const message = error.response?.data?.message || "An error occurred";
        throw new Error(message);
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

  const handleFileNumberClick = async (fileNo) => {
    if (!fileNo) return;
    
    setLoadingVehicle(true);
    setVehicleModalOpen(true);
    
    try {
      const { data } = await apiClient.get(`/vehicle/file/${fileNo}`, {
        headers: {
          Authorization: token,
        },
      });
      
      if (data.success) {
        setVehicleData(data.data);
      }
    } catch (error) {
      console.error("Error fetching vehicle data:", error);
      toast.error("Failed to fetch vehicle information");
    } finally {
      setLoadingVehicle(false);
    }
  };

  if (!driverData) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6 text-blue-600" />
              {driverData.fullname}
            </DialogTitle>
            <DialogDescription className="text-lg">
              Driver ID: {driverData._id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Personal Information */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">File Number</p>
                        <button
                          onClick={() => handleFileNumberClick(driverData.fileNo)}
                          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
                        >
                          {driverData.fileNo || "N/A"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Plate Number</p>
                        <p className="font-medium">{driverData.plateNo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Owner/Representative</p>
                        <p className="font-medium">{driverData.ownerRepresentativeName || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Date of Birth</p>
                        <p className="font-medium">
                          {driverData.birthDate ? formatSimpleDate(driverData.birthDate) : "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Contact Number</p>
                        <p className="font-medium">{driverData.contactNumber || "None"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Email Address</p>
                        <p className="font-medium">{driverData.emailAddress || "None"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Driver's License</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={driverData.hasDriversLicense ? "default" : "destructive"}>
                            {driverData.hasDriversLicense ? "Yes" : "No"}
                          </Badge>
                          {driverData.hasDriversLicense && driverData.driversLicenseNumber && (
                            <span className="text-sm text-gray-600">
                              {driverData.driversLicenseNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Purok</p>
                      <p className="font-medium">{driverData.address?.purok || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Barangay</p>
                      <p className="font-medium">{driverData.address?.barangay || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Municipality</p>
                      <p className="font-medium">{driverData.address?.municipality || "N/A"}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Province</p>
                      <p className="font-medium">{driverData.address?.province || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Region</p>
                      <p className="font-medium">{driverData.address?.region || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={() => navigate(`${location.pathname}/edit`)}
                size="sm"
                className="font-semibold"
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Driver
              </Button>
              <Button
                className="font-semibold border border-destructive bg-red-100 text-destructive hover:bg-red-200/70 dark:bg-red-300 dark:hover:bg-red-300/80"
                onClick={handleDeactivate}
                disabled={submitting}
              >
                <Trash className="h-4 w-4 mr-2" />
                {submitting ? "Processing..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Modal */}
      <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Information
            </DialogTitle>
            <DialogDescription>
              Vehicle details for file number: {driverData?.fileNo}
            </DialogDescription>
          </DialogHeader>

          {loadingVehicle ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicleData ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Plate Number</p>
                        <p className="font-medium">{vehicleData.plateNo || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">File Number</p>
                        <p className="font-medium">{vehicleData.fileNo || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Engine Number</p>
                        <p className="font-medium">{vehicleData.engineNo || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Chassis Number</p>
                        <p className="font-medium">{vehicleData.chassisNo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Make</p>
                        <p className="font-medium">{vehicleData.make || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Body Type</p>
                        <p className="font-medium">{vehicleData.bodyType || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Color</p>
                        <p className="font-medium">{vehicleData.color || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Classification</p>
                        <p className="font-medium">{vehicleData.classification || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Date of Renewal</p>
                      <p className="font-medium">
                        {vehicleData.dateOfRenewal 
                          ? formatSimpleDate(vehicleData.dateOfRenewal) 
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge variant={vehicleData.status === "Active" ? "default" : "destructive"}>
                        {vehicleData.status || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No vehicle information found for this file number.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation Dialog */}
      <ConfirmationDIalog
        open={showAlert}
        onOpenChange={setShowAlert}
        cancel={cancelDelete}
        confirm={confirmDelete}
        title={"Are you sure?"}
        description={"This action cannot be undone. This will deactivate the driver"}
      />
    </>
  );
};

export default DriverModal;
