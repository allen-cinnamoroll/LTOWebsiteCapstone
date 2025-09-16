import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, Search, Calendar, User, MapPin, Phone, Mail, Car, Save, CalendarIcon } from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/calendar/DatePicker";
import { toast } from "sonner";

const VehicleRenewalModal = ({ open, onOpenChange, onVehicleUpdated }) => {
  const [plateNo, setPlateNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [error, setError] = useState("");
  const [newRenewalDate, setNewRenewalDate] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { token } = useAuth();

  const handleSearch = async () => {
    if (!plateNo.trim()) {
      setError("Please enter a plate number");
      return;
    }

    setLoading(true);
    setError("");
    setVehicleData(null);

    try {
      const { data } = await apiClient.get(`/vehicle/owner/${plateNo.trim()}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        setVehicleData(data.data);
        // Set the current renewal date as the initial value for the date picker
        setNewRenewalDate(data.data.vehicle.dateOfRenewal ? new Date(data.data.vehicle.dateOfRenewal) : new Date());
        setUpdateSuccess(false);
      } else {
        setError(data.message || "Failed to fetch vehicle information");
      }
    } catch (err) {
      console.error("Error fetching vehicle data:", err);
      setError(
        err.response?.data?.message || 
        "Vehicle not found or error occurred while fetching data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlateNo("");
    setVehicleData(null);
    setError("");
    setNewRenewalDate(null);
    setUpdating(false);
    setUpdateSuccess(false);
    onOpenChange(false);
  };

  const handleUpdateRenewalDate = async () => {
    if (!vehicleData || !newRenewalDate) {
      setError("Please select a renewal date");
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const { data } = await apiClient.patch(
        `/vehicle/${vehicleData.vehicle._id}`,
        {
          dateOfRenewal: newRenewalDate.toISOString(),
        },
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (data.success) {
        setUpdateSuccess(true);
        toast.success("Vehicle Updated Successfully", {
          description: `Renewal date updated for ${vehicleData.vehicle.plateNo}`,
        });
        
        // Refresh the vehicle data to show updated information with new status
        try {
          const { data: updatedData } = await apiClient.get(`/vehicle/owner/${plateNo.trim()}`, {
            headers: {
              Authorization: token,
            },
          });

          if (updatedData.success) {
            setVehicleData(updatedData.data);
            // Update the renewal date picker with the new date
            setNewRenewalDate(updatedData.data.vehicle.dateOfRenewal ? new Date(updatedData.data.vehicle.dateOfRenewal) : new Date());
            
            // Notify parent component to refresh the vehicle list
            if (onVehicleUpdated) {
              onVehicleUpdated();
            }
          }
        } catch (refreshError) {
          console.error("Error refreshing vehicle data:", refreshError);
          // Still show success even if refresh fails
        }
      } else {
        setError(data.message || "Failed to update renewal date");
      }
    } catch (err) {
      console.error("Error updating renewal date:", err);
      setError(
        err.response?.data?.message || 
        "Failed to update renewal date"
      );
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    return status === "1" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getStatusText = (status) => {
    return status === "1" ? "Active" : "Expired";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar]:bg-transparent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle Renewal Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plateNo">Plate Number</Label>
              <div className="flex gap-2">
                <Input
                  id="plateNo"
                  placeholder="Enter plate number (e.g., ABC123)"
                  value={plateNo}
                  onChange={(e) => setPlateNo(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={loading}
                  className="px-6"
                >
                  {loading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {updateSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">Renewal date updated successfully!</p>
              </div>
            )}
          </div>

          {/* Vehicle Information */}
          {vehicleData && (
            <div className="space-y-4">
              {/* Vehicle Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle Information
                    </span>
                    <Badge className={getStatusColor(vehicleData.vehicle.status)}>
                      {getStatusText(vehicleData.vehicle.status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Plate Number</Label>
                      <p className="text-sm font-semibold">{vehicleData.vehicle.plateNo}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Make & Model</Label>
                      <p className="text-sm">{vehicleData.vehicle.make} {vehicleData.vehicle.bodyType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Color</Label>
                      <p className="text-sm">{vehicleData.vehicle.color}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Last Renewal</Label>
                      <p className="text-sm">
                        {vehicleData.vehicle.dateOfRenewal 
                          ? formatDate(vehicleData.vehicle.dateOfRenewal)
                          : "Not set"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Update Renewal Date Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Update Renewal Date
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">New Renewal Date</Label>
                    <div className="mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newRenewalDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newRenewalDate ? formatDate(newRenewalDate) : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePicker
                            fieldValue={newRenewalDate}
                            dateValue={setNewRenewalDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleUpdateRenewalDate}
                      disabled={updating || !newRenewalDate}
                      className="flex items-center gap-2"
                    >
                      {updating ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {updating ? "Updating..." : "Update Renewal Date"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Owner Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Owner Name</Label>
                    <p className="text-sm font-semibold">{vehicleData.owner.name}</p>
                  </div>
                  
                  {vehicleData.owner.address && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Address
                      </Label>
                      <p className="text-sm">
                        {vehicleData.owner.address.purok && `${vehicleData.owner.address.purok}, `}
                        {vehicleData.owner.address.barangay}, {vehicleData.owner.address.municipality}
                        <br />
                        {vehicleData.owner.address.province}, {vehicleData.owner.address.region}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {vehicleData.owner.contactNumber && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Contact Number
                        </Label>
                        <p className="text-sm">{vehicleData.owner.contactNumber}</p>
                      </div>
                    )}
                    
                    {vehicleData.owner.emailAddress && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </Label>
                        <p className="text-sm">{vehicleData.owner.emailAddress}</p>
                      </div>
                    )}
                  </div>

                  {vehicleData.owner.driversLicenseNumber && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Driver's License</Label>
                      <p className="text-sm">{vehicleData.owner.driversLicenseNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expiration Information */}
              {vehicleData.expirationInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Expiration Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Expiration Month</Label>
                        <p className="text-sm font-semibold">{vehicleData.expirationInfo.month}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Week</Label>
                        <p className="text-sm capitalize">{vehicleData.expirationInfo.week} week</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Expiration Date</Label>
                        <p className="text-sm">
                          {vehicleData.expirationInfo.expirationDate 
                            ? formatDate(vehicleData.expirationInfo.expirationDate)
                            : "Not calculated"
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                        <Badge className={vehicleData.expirationInfo.isExpired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                          {vehicleData.expirationInfo.isExpired ? "Expired" : "Active"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleRenewalModal;
