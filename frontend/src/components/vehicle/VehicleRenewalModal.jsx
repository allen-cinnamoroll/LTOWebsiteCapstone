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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
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
    setErrorModalOpen(false);
    setErrorMessage("");
    setSuccessModalOpen(false);
    onOpenChange(false);
  };

  const handleUpdateRenewalDate = async () => {
    if (!vehicleData || !newRenewalDate) {
      setErrorMessage("Please select a renewal date");
      setErrorModalOpen(true);
      return;
    }

    // Get current expiration date (calculated from plate number and latest renewal date)
    const currentExpirationDate = getCurrentExpirationDate();
    if (!currentExpirationDate) {
      setErrorMessage("Vehicle must have a current expiration date to renew.");
      setErrorModalOpen(true);
      return;
    }

    // Validate renewal date using new validation rules
    const validation = validateRenewalDate(newRenewalDate, currentExpirationDate);
    if (!validation.valid) {
      setErrorMessage(validation.message);
      setErrorModalOpen(true);
      return;
    }

    setUpdating(true);

    try {
      // Build updated array using existing entries, append new one; backend will normalize and attach processedBy
      const currentDates = vehicleData.dateOfRenewal || [];
      const datesArray = Array.isArray(currentDates) ? currentDates : [currentDates].filter(Boolean);
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
        setSuccessModalOpen(true);
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
    return status === "1" 
      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700" 
      : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700";
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

  // Calculate expiration date based on plate number and renewal date
  const calculateExpirationDate = (plateNo, renewalDate, vehicleStatusType = "Old") => {
    if (!plateNo) return null;

    // Extract last two digits from plate number
    const digits = plateNo.replace(/\D/g, '');
    if (digits.length < 2) return null;

    const lastTwoDigits = digits.slice(-2);
    const secondToLastDigit = lastTwoDigits[0];
    const lastDigit = lastTwoDigits[1];

    // Week lookup table
    const WEEK_LOOKUP = {
      '1': 'first', '2': 'first', '3': 'first',
      '4': 'second', '5': 'second', '6': 'second',
      '7': 'third', '8': 'third',
      '9': 'last', '0': 'last'
    };

    // Month lookup table (last digit maps to month index)
    const MONTH_LOOKUP = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
      '7': 6, '8': 7, '9': 8, '0': 9
    };

    const week = WEEK_LOOKUP[secondToLastDigit];
    const monthIndex = MONTH_LOOKUP[lastDigit];

    if (!week || monthIndex === null) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    let expirationYear, expirationMonth;

    if (vehicleStatusType === "New") {
      // New vehicles: 3 years from renewal date
      if (renewalDate) {
        expirationYear = renewalDate.getFullYear() + 3;
        expirationMonth = monthIndex;
      } else {
        expirationYear = currentYear + 3;
        expirationMonth = monthIndex;
      }
    } else {
      // Old vehicles: expires yearly based on plate number
      if (renewalDate) {
        const renewalYear = renewalDate.getFullYear();
        if (renewalYear === currentYear) {
          expirationYear = currentYear + 1;
          expirationMonth = monthIndex;
        } else {
          expirationYear = currentYear;
          expirationMonth = monthIndex;
        }
      } else {
        expirationYear = currentYear;
        expirationMonth = monthIndex;
      }
    }

    // Calculate week end date
    let weekEndDate;
    switch (week) {
      case 'first':
        weekEndDate = new Date(expirationYear, expirationMonth, 7);
        break;
      case 'second':
        weekEndDate = new Date(expirationYear, expirationMonth, 14);
        break;
      case 'third':
        weekEndDate = new Date(expirationYear, expirationMonth, 21);
        break;
      case 'last':
        weekEndDate = new Date(expirationYear, expirationMonth + 1, 0);
        break;
      default:
        return null;
    }

    // Set expiration to midnight of the next day after the week ends
    const expirationDate = new Date(weekEndDate);
    expirationDate.setDate(expirationDate.getDate() + 1);
    expirationDate.setHours(0, 0, 0, 0);

    return expirationDate;
  };

  const getCurrentExpirationDate = () => {
    const latestRenewalDate = getLatestRenewalDate();
    if (!latestRenewalDate || !vehicleData?.plateNo) return null;
    
    const vehicleStatusType = vehicleData.vehicleStatusType || "Old";
    return calculateExpirationDate(vehicleData.plateNo, latestRenewalDate, vehicleStatusType);
  };

  // Get the expiration month from plate number (for validation purposes)
  const getExpirationMonthFromPlate = () => {
    if (!vehicleData?.plateNo) return null;
    
    const digits = vehicleData.plateNo.replace(/\D/g, '');
    if (digits.length < 1) return null;
    
    const lastDigit = digits.slice(-1);
    const MONTH_LOOKUP = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
      '7': 6, '8': 7, '9': 8, '0': 9
    };
    
    const monthIndex = MONTH_LOOKUP[lastDigit];
    if (monthIndex === undefined) return null;
    
    // Calculate expiration year based on latest renewal date
    const latestRenewalDate = getLatestRenewalDate();
    if (!latestRenewalDate) return null;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const renewalYear = latestRenewalDate.getFullYear();
    const vehicleStatusType = vehicleData.vehicleStatusType || "Old";
    
    let expirationYear;
    if (vehicleStatusType === "New") {
      expirationYear = renewalYear + 3;
    } else {
      if (renewalYear === currentYear) {
        expirationYear = currentYear + 1;
      } else {
        expirationYear = currentYear;
      }
    }
    
    return { month: monthIndex, year: expirationYear };
  };

  const validateRenewalDate = (newDate, currentExpirationDate) => {
    if (!newDate || !currentExpirationDate) {
      return { valid: false, message: "Please select a renewal date and ensure vehicle has a current expiration date." };
    }

    const newDateObj = new Date(newDate);
    const expirationDateObj = new Date(currentExpirationDate);
    const newRenewalYear = newDateObj.getFullYear();

    // FIRST: Check the 2-month advance rule
    // This rule ALWAYS applies, regardless of whether there's a renewal in the same year or not
    // Rule: You can renew up to 2 months before the EXPIRATION MONTH (from plate number, not the calculated date)
    // Example: If expiration month is January (plate ends in "1"), you can renew starting in November (2 months before January)
    // Example: If expiration month is October (plate ends in "0"), you can renew starting in August (2 months before October)
    
    const expirationMonthInfo = getExpirationMonthFromPlate();
    if (!expirationMonthInfo) {
      return { valid: false, message: "Could not determine expiration month from plate number." };
    }
    
    const expirationMonth = expirationMonthInfo.month; // 0-11 (0=January, 11=December)
    const expirationYear = expirationMonthInfo.year;
    const renewalMonth = newDateObj.getMonth(); // 0-11
    const renewalYear = newDateObj.getFullYear();
    
    // Calculate the difference in months between expiration MONTH and renewal MONTH
    // Positive means renewal month is after expiration month, negative means before
    const monthsDifference = (renewalYear - expirationYear) * 12 + (renewalMonth - expirationMonth);
    
    // If renewing before expiration month (negative months difference)
    if (monthsDifference < 0) {
      const monthsBefore = Math.abs(monthsDifference);
      // Check if renewing more than 2 months in advance (3 months or more)
      if (monthsBefore >= 3) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const expirationMonthName = monthNames[expirationMonth];
        return {
          valid: false,
          message: `Vehicles can only be renewed up to 2 months in advance of their expiration month. The expiration month is ${expirationMonthName} ${expirationYear}, and you are trying to renew ${monthsBefore} month(s) in advance.`
        };
      }
      // Renewing 1 or 2 months before expiration month is allowed (2-month rule passes)
      // Continue to check the "once per year" rule below
    } else if (monthsDifference >= 0) {
      // If renewing in the same month or after expiration month, it's allowed
      // Continue to check the "once per year" rule below
    }

    // SECOND: Check if renewing in the same year as any existing renewal
    // Vehicle can only be renewed once per year, EXCEPT if renewing within the 2-month advance window
    // This allows early renewal in the advance window even if there was a renewal earlier in the year
    const currentDates = vehicleData.dateOfRenewal || [];
    const datesArray = Array.isArray(currentDates) ? currentDates : [currentDates].filter(Boolean);
    const normalizedDates = datesArray.map(d => {
      const date = d && typeof d === 'object' && d.date ? d.date : d;
      if (!date) return null;
      const parsedDate = new Date(date);
      // Check if date is valid
      if (isNaN(parsedDate.getTime())) return null;
      return parsedDate;
    }).filter(Boolean);

    // Check if new renewal date is in the same year as any existing renewal
    const sameYearRenewal = normalizedDates.find(existingDate => {
      if (!existingDate || isNaN(existingDate.getTime())) return false;
      return existingDate.getFullYear() === newRenewalYear;
    });

    if (sameYearRenewal) {
      // If there's a renewal in the same year, check if the new renewal is within the 2-month advance window
      // If it is, allow it (user is renewing early for the next expiration cycle)
      // If not, block it (trying to renew twice in the same year outside the advance window)
      const isWithinAdvanceWindow = monthsDifference < 0 && monthsDifference >= -2;
      
      if (!isWithinAdvanceWindow) {
        const existingRenewalDate = sameYearRenewal.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        return {
          valid: false,
          message: `Vehicle can only be renewed once per year. A renewal already exists on ${existingRenewalDate} (${newRenewalYear}). You cannot renew again in ${newRenewalYear} unless you are renewing within the 2-month advance window.`
        };
      }
      // If within advance window, allow it (renewing early for next expiration cycle)
    }

    // Both rules passed
    return { valid: true, message: "" };
  };

  const getStatusBadge = (status) => {
    const isActive = status === "1" || status === 1;
    return (
      <div className="flex items-center gap-1">
        {isActive ? (
          <CheckCircle2Icon className="h-3 w-3 text-green-500 dark:text-green-400" />
        ) : (
          <CircleAlert className="h-3 w-3 text-red-500 dark:text-red-400" />
        )}
        <span className={`text-xs font-semibold ${
          isActive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
                <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Vehicle Renewal</span>
              </DialogTitle>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Update renewal date for vehicle registration
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                File Number: <span className="font-semibold text-blue-600 dark:text-blue-400 ml-1">{vehicleData.fileNo || "N/A"}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {/* Combined Vehicle & Owner Information */}
          <div className="space-y-3 mb-4">
            <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
                  <span className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    Vehicle & Owner Information
                  </span>
                  <Badge className={getStatusColor(vehicleData.status)}>
                    {getStatusText(vehicleData.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="bg-white dark:bg-gray-800/70 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                      <Hash className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                      Plate Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.plateNo}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/70 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <label className="text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                      <FileText className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                      File Number
                    </label>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData.fileNo || "N/A"}</p>
                  </div>
                  {ownerData && (
                    <>
                      <div className="bg-white dark:bg-gray-800/70 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          Owner Name
                        </label>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData.ownerRepresentativeName || "N/A"}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/70 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm md:col-start-2">
                        <label className="text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          Current Renewal Date
                        </label>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{(() => {
                          const d = getLatestRenewalDate();
                          return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
                        })()}</p>
                      </div>
                      {ownerData.address && (
                        <div className="bg-white dark:bg-gray-800/70 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm md:col-span-2">
                          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-600 dark:text-gray-400" />
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
              <Card className="bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Calendar className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  Vehicle Renewal Date
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">New Renewal Date</Label>
                    <div className="mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal dark:bg-[#18181B] dark:text-white dark:border-gray-700 dark:hover:bg-[#18181B]",
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
                      onClick={() => {
                        // Validate before opening confirmation
                        setError("");
                        if (!newRenewalDate) {
                          setErrorMessage("Please select a renewal date");
                          setErrorModalOpen(true);
                          return;
                        }

                        const currentExpirationDate = getCurrentExpirationDate();
                        if (!currentExpirationDate) {
                          setErrorMessage("Vehicle must have a current expiration date to renew.");
                          setErrorModalOpen(true);
                          return;
                        }

                        const validation = validateRenewalDate(newRenewalDate, currentExpirationDate);
                        if (!validation.valid) {
                          setErrorMessage(validation.message);
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
      <DialogContent className="max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <CalendarCheck2Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Renewal Confirmation
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2 pb-3">
          {(() => {
            // Check if this is an advance renewal
            const expirationMonthInfo = getExpirationMonthFromPlate();
            if (expirationMonthInfo && newRenewalDate) {
              const newDateObj = new Date(newRenewalDate);
              const expirationMonth = expirationMonthInfo.month;
              const expirationYear = expirationMonthInfo.year;
              const renewalMonth = newDateObj.getMonth();
              const renewalYear = newDateObj.getFullYear();
              const monthsDifference = (renewalYear - expirationYear) * 12 + (renewalMonth - expirationMonth);
              
              // If renewing before expiration month (negative months difference), it's an advance renewal
              const isAdvanceRenewal = monthsDifference < 0;
              
              if (isAdvanceRenewal) {
                const monthsBefore = Math.abs(monthsDifference);
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const expirationMonthName = monthNames[expirationMonth];
                return (
                  <>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">
                      Are you sure you want to renew this vehicle in advance?
                    </p>
                    <p className="mt-1 text-gray-600 dark:text-gray-300">
                      This renewal is {monthsBefore} month(s) before the expiration month ({expirationMonthName} {expirationYear}).
                    </p>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                      Please review the details below before confirming.
                    </p>
                  </>
                );
              }
            }
            return (
              <>
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to renew this vehicle?
          </p>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            Please review the details below before confirming.
          </p>
              </>
            );
          })()}
          <p className="mt-3 text-gray-600 dark:text-gray-300"><span className="font-medium">File Number:</span> {vehicleData.fileNo || 'N/A'}</p>
          <p className="text-gray-600 dark:text-gray-300"><span className="font-medium">Renewal Date:</span> {newRenewalDate ? new Date(newRenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)} className="min-w-[80px] bg-white dark:bg-gray-800 border-gray-300 dark:border-[#424242] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">No</Button>
          <Button onClick={async () => { setConfirmOpen(false); await handleUpdateRenewalDate(); }} className="min-w-[80px] bg-blue-600 hover:bg-blue-700 text-white">Yes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* Error Modal */}
    <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <CircleAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
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
            className="min-w-[80px] bg-white dark:bg-gray-800 border-gray-300 dark:border-[#424242] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {/* Success Modal */}
    <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <CheckCircle2Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
            Success
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2 pb-3">
          <p className="text-gray-600 dark:text-gray-300">
            Vehicle renewed successfully!
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Renewal date has been updated for {vehicleData?.plateNo || 'this vehicle'}.
          </p>
        </div>
        <DialogFooter className="flex justify-end gap-3">
          <Button 
            onClick={() => {
              setSuccessModalOpen(false);
              handleClose();
            }} 
            className="min-w-[80px] bg-green-600 hover:bg-green-700 text-white"
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