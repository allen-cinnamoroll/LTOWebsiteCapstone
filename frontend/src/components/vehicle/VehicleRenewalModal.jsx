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
  CalendarCheck2Icon,
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { token } = useAuth();

  useEffect(() => {
    if (open && vehicleData) {
      // Default to today's date for new renewal
      setNewRenewalDate(new Date());
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
    setConfirmOpen(false);
    onOpenChange(false);
  };

  const handleUpdateRenewalDate = async () => {
    if (!vehicleData || !newRenewalDate) {
      setErrorMessage("Please select a renewal date");
      setErrorModalOpen(true);
      return;
    }

    // Prevent using the same date as the latest current renewal
    const currentDates = vehicleData.dateOfRenewal || [];
    const datesArray = Array.isArray(currentDates) ? currentDates : [currentDates].filter(Boolean);
    const latestRaw = datesArray.length ? datesArray[datesArray.length - 1] : null;
    const latestDate = latestRaw && typeof latestRaw === 'object' && latestRaw.date ? latestRaw.date : latestRaw;
    const isSameDay = (a, b) => {
      if (!a || !b) return false;
      const da = new Date(a); const db = new Date(b);
      return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
    };
    if (latestDate && isSameDay(newRenewalDate, latestDate)) {
      setErrorMessage("The selected date matches the current renewal date. Please choose a different date.");
      setErrorModalOpen(true);
      return;
    }

    setUpdating(true);

    try {
      // Build updated array using existing entries, append new one; backend will normalize and attach processedBy
      const normalized = datesArray.map(d => (d && typeof d === 'object' && d.date ? d.date : d)).filter(Boolean);
      const updatedDates = [...normalized, newRenewalDate.toISOString()];

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
        setErrorMessage(data.message || "Failed to update renewal date");
        setErrorModalOpen(true);
      }
    } catch (err) {
      console.error("Error updating renewal date:", err);
      setErrorMessage(
        err.response?.data?.message || 
        "Failed to update renewal date"
      );
      setErrorModalOpen(true);
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

  const getLatestRenewalDate = () => {
    const dates = vehicleData?.dateOfRenewal;
    if (!dates) return null;
    const dateArray = Array.isArray(dates) ? dates : [dates];
    const latestRaw = dateArray[dateArray.length - 1];
    const latest = latestRaw && typeof latestRaw === 'object' && latestRaw.date ? latestRaw.date : latestRaw;
    return latest ? new Date(latest) : null;
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
    return dateArray
      .map(entry => new Date(entry?.date || entry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .join(", ");
  };

  if (!vehicleData) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl h-[80vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Fixed Header */}
        <DialogHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Vehicle Renewal</span>
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

        <div className="flex flex-col flex-1 min-h-0">
          {/* Combined Vehicle & Owner Information */}
          <div className="space-y-3 mb-4">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Vehicle & Owner Information
                  </span>
                  <Badge className={getStatusColor(vehicleData.status)}>
                    {getStatusText(vehicleData.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Plate Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.plateNo}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      File Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.fileNo || "N/A"}</p>
                  </div>
                  {ownerData && (
                    <>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Owner Name
                        </label>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData.ownerRepresentativeName || "N/A"}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm md:col-start-2">
                        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Current Renewal Date
                        </label>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{(() => {
                          const d = getLatestRenewalDate();
                          return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
                        })()}</p>
                      </div>
                      {ownerData.address && (
                        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm md:col-span-2">
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
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Update Renewal Date Section */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                  Vehicle Renewal Date
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
                
                {updateSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600">Vehicle renewed successfully!</p>
                  </div>
                )}
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        // Validate before opening confirmation
                        setError("");
                        const currentDates = vehicleData.dateOfRenewal || [];
                        const datesArray = Array.isArray(currentDates) ? currentDates : [currentDates].filter(Boolean);
                        const latestRaw = datesArray.length ? datesArray[datesArray.length - 1] : null;
                        const latestDate = latestRaw && typeof latestRaw === 'object' && latestRaw.date ? latestRaw.date : latestRaw;
                        const isSameDay = (a, b) => {
                          if (!a || !b) return false;
                          const da = new Date(a); const db = new Date(b);
                          return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
                        };
                        if (latestDate && isSameDay(newRenewalDate, latestDate)) {
                          setErrorMessage("The selected date matches the current renewal date. Please choose a different date.");
                          setErrorModalOpen(true);
                          return;
                        }
                        setConfirmOpen(true);
                      }}
                      disabled={updating || !newRenewalDate}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {updating ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    {updating ? "Adding Renewal..." : "Click to renew vehicle"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>

        {/* Removed bottom footer close button as requested */}
      </DialogContent>
    </Dialog>
    {/* Confirmation Dialog */}
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="max-w-md bg-white border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck2Icon className="h-5 w-5" />
            Renewal Confirmation
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2 pb-3">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to renew this vehicle?
          </p>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            Please review the details below before confirming.
          </p>
          <p className="mt-3 text-gray-600 dark:text-gray-300"><span className="font-medium">File Number:</span> {vehicleData.fileNo || 'N/A'}</p>
          <p className="text-gray-600 dark:text-gray-300"><span className="font-medium">Renewal Date:</span> {newRenewalDate ? new Date(newRenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} className="min-w-[80px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">No</Button>
          <Button onClick={async () => { setConfirmOpen(false); await handleUpdateRenewalDate(); }} className="min-w-[80px] bg-blue-600 hover:bg-blue-700 text-white">Yes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* Error Modal */}
    <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
      <DialogContent className="max-w-md bg-white border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-red-600" />
            Error
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2 pb-3">
          <p className="text-gray-600 dark:text-gray-300">
            {errorMessage}
          </p>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setErrorModalOpen(false)} 
            className="min-w-[80px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default VehicleRenewalModal;