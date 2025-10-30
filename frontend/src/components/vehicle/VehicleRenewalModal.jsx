import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LoaderCircle, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Car, 
  Save, 
  CalendarIcon,
  RefreshCw,
  CheckCircle2Icon,
  CircleAlert,
  Hash,
  FileText,
  Wrench,
  Building,
  Palette,
  Tag,
  Shield,
  Clock
} from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import DatePicker from "@/components/calendar/DatePicker";
import { toast } from "sonner";

const VehicleRenewalModal = ({ open, onOpenChange, vehicleData, onVehicleUpdated }) => {
  const [newRenewalDate, setNewRenewalDate] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [ownerData, setOwnerData] = useState(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (open && vehicleData) {
      // Set the current renewal date as the initial value for the date picker
      const currentDates = vehicleData.dateOfRenewal;
      const latestDate = Array.isArray(currentDates) && currentDates.length > 0 
        ? currentDates[currentDates.length - 1] 
        : currentDates;
      
      setNewRenewalDate(latestDate ? new Date(latestDate) : new Date());
      setUpdateSuccess(false);
      setError("");
      
      // Fetch owner data
      if (vehicleData.driverId) {
        fetchOwnerData();
      }
    }
  }, [open, vehicleData]);

  const fetchOwnerData = async () => {
    if (!vehicleData?.driverId) return;
    
    setLoadingOwner(true);
    try {
      const { data } = await apiClient.get(`/driver/${vehicleData.driverId}`, {
        headers: {
          Authorization: token,
        },
      });
      setOwnerData(data.data);
    } catch (error) {
      console.error("Error fetching owner data:", error);
    } finally {
      setLoadingOwner(false);
    }
  };

  const handleClose = () => {
    setNewRenewalDate(null);
    setUpdating(false);
    setUpdateSuccess(false);
    setError("");
    setOwnerData(null);
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
      // Build updated array using existing entries, append new one; backend will normalize and attach processedBy
      const currentDates = vehicleData.dateOfRenewal || [];
      const datesArray = Array.isArray(currentDates) ? currentDates : [currentDates].filter(Boolean);
      const updatedDates = [...datesArray, newRenewalDate.toISOString()];

      const { data } = await apiClient.patch(
        `/vehicle/${vehicleData._id}`,
        {
          dateOfRenewal: updatedDates,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (data.success) {
        setUpdateSuccess(true);
        toast.success("Vehicle Renewed Successfully", {
          description: `Renewal date added for ${vehicleData.plateNo}`,
        });
        
        // Notify parent component to refresh the vehicle list
        if (onVehicleUpdated) {
          onVehicleUpdated();
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

  const getStatusBadge = (status) => {
    const isActive = status === "1" || status === 1;
    return (
      <div className="flex items-center gap-1">
        {isActive ? (
          <CheckCircle2Icon className="h-3 w-3 text-green-500" />
        ) : (
          <CircleAlert className="h-3 w-3 text-red-500" />
        )}
        <span className={`text-xs font-semibold ${
          isActive ? "text-green-600" : "text-red-600"
        }`}>
          {isActive ? "Active" : "Expired"}
        </span>
      </div>
    );
  };

  const formatRenewalHistory = (dates) => {
    if (!dates || (Array.isArray(dates) && dates.length === 0)) {
      return "No renewal history";
    }
    
    const dateArray = Array.isArray(dates) ? dates : [dates];
    return dateArray.map(date => new Date(date).toLocaleDateString()).join(", ");
  };

  if (!vehicleData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Fixed Header */}
        <DialogHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Vehicle Renewal
              </DialogTitle>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Update renewal date for vehicle registration
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-500" />
                File Number: <span className="font-semibold text-blue-600">{vehicleData.fileNo || "N/A"}</span>
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Vehicle Information */}
          <div className="space-y-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle Information
                  </span>
                  <Badge className={getStatusColor(vehicleData.status)}>
                    {getStatusText(vehicleData.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Plate Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.plateNo}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      File Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.fileNo || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      Engine Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.engineNo || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Chassis Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.serialChassisNumber || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Make
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.make || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      Body Type
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.bodyType || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Palette className="h-3 w-3" />
                      Color
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.color || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Classification
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.classification || "N/A"}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Renewal History
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{formatRenewalHistory(vehicleData.dateOfRenewal)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Status
                    </label>
                    <div className="ml-4">
                      {getStatusBadge(vehicleData.status)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Vehicle Status Type
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.vehicleStatusType || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            {ownerData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Owner/Representative Name
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData.ownerRepresentativeName || "N/A"}</p>
                  </div>
                  {ownerData.contactNumber && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                      <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Contact Number
                      </label>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData.contactNumber}</p>
                    </div>
                  )}
                  {ownerData.emailAddress && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                      <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email Address
                      </label>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData.emailAddress}</p>
                    </div>
                  )}
                  {ownerData.address && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                      <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Address
                      </label>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">
                        {[
                          ownerData.address.barangay,
                          ownerData.address.municipality,
                          ownerData.address.province
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Update Renewal Date Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Add New Renewal Date
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
                
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {updateSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600">Renewal date added successfully!</p>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUpdateRenewalDate}
                    disabled={updating || !newRenewalDate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updating ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {updating ? "Adding Renewal..." : "Add Renewal Date"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleRenewalModal;