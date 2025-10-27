import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const VehicleRenewalModal = ({ 
  open, 
  onOpenChange, 
  vehicleData, 
  onVehicleUpdated 
}) => {
  const [loading, setLoading] = useState(false);
  const [renewalDate, setRenewalDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNoChanges, setShowNoChanges] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { token } = useAuth();

  useEffect(() => {
    if (vehicleData && open) {
      console.log('=== MODAL OPEN DEBUG ===');
      console.log('vehicleData:', vehicleData);
      console.log('vehicleData.dateOfRenewal:', vehicleData.dateOfRenewal);
      
      // Set current renewal date as default
      const renewalDateValue = vehicleData.dateOfRenewal ? format(new Date(vehicleData.dateOfRenewal), "yyyy-MM-dd") : "";
      console.log('Setting renewalDate to:', renewalDateValue);
      setRenewalDate(renewalDateValue);
      
      // Set current month to the renewal date month for better UX
      if (vehicleData.dateOfRenewal) {
        const monthDate = new Date(vehicleData.dateOfRenewal);
        console.log('Setting currentMonth to:', monthDate);
        setCurrentMonth(monthDate);
      }
      console.log('=== END MODAL OPEN DEBUG ===');
    }
  }, [vehicleData, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== SUBMIT DEBUG ===');
    console.log('Current renewalDate state:', renewalDate);
    console.log('Vehicle data dateOfRenewal:', vehicleData?.dateOfRenewal);
    console.log('=== END SUBMIT DEBUG ===');
    
    if (!renewalDate) {
      toast.error("Please select a renewal date");
      return;
    }

    if (!vehicleData?._id) {
      toast.error("Vehicle data not found");
      return;
    }

    // Check if the date has changed
    const currentDate = vehicleData.dateOfRenewal ? format(new Date(vehicleData.dateOfRenewal), "yyyy-MM-dd") : "";
    const newDate = renewalDate;
    
    console.log('=== DATE COMPARISON DEBUG ===');
    console.log('Original vehicleData.dateOfRenewal:', vehicleData.dateOfRenewal);
    console.log('Formatted currentDate:', currentDate);
    console.log('Selected newDate:', newDate);
    console.log('Dates are equal:', currentDate === newDate);
    console.log('=== END DATE COMPARISON DEBUG ===');
    
    if (currentDate === newDate) {
      // No changes detected
      setShowNoChanges(true);
      return;
    }

    // Date has changed, show confirmation
    setShowConfirmation(true);
  };

  const handleConfirmRenewal = async () => {
    setLoading(true);
    setShowConfirmation(false);
    
    try {
      console.log('Updating vehicle renewal:', {
        vehicleId: vehicleData._id,
        renewalDate: renewalDate,
        endpoint: `/vehicle/${vehicleData._id}`
      });

      const response = await apiClient.patch(
        `/vehicle/${vehicleData._id}`,
        {
          dateOfRenewal: new Date(renewalDate).toISOString()
        },
        {
          headers: {
            Authorization: token,
          },
        }
      );

      console.log('Update response:', response.data);

      if (response.data.success) {
        toast.success("Vehicle renewal date updated successfully!");
        onVehicleUpdated?.();
        onOpenChange(false);
      } else {
        toast.error(response.data.message || "Failed to update renewal date");
      }
    } catch (error) {
      console.error("Error updating vehicle renewal:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      toast.error(
        error.response?.data?.message || 
        "Failed to update renewal date. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRenewalDate("");
    setShowConfirmation(false);
    setShowNoChanges(false);
    onOpenChange(false);
  };

  const handleNoChangesContinue = () => {
    setShowNoChanges(false);
    // Keep the modal open for editing
  };

  const handleNoChangesCancel = () => {
    setShowNoChanges(false);
    onOpenChange(false);
  };

  const handleConfirmationCancel = () => {
    setShowConfirmation(false);
  };

  if (!vehicleData) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Renew Vehicle</DialogTitle>
          <DialogDescription>
            Update the renewal date for vehicle {vehicleData.plateNo} ({vehicleData.fileNo})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Vehicle Information</h4>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Plate No:</span>
                <span className="text-gray-900 dark:text-gray-100">{vehicleData.plateNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">File No:</span>
                <span className="text-gray-900 dark:text-gray-100">{vehicleData.fileNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Make:</span>
                <span className="text-gray-900 dark:text-gray-100">{vehicleData.make || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Current Renewal Date:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {vehicleData.dateOfRenewal 
                    ? format(new Date(vehicleData.dateOfRenewal), "MMM dd, yyyy")
                          : "Not set"
                        }
                </span>
              </div>
                    </div>
                  </div>

          <div className="space-y-2">
            <Label htmlFor="renewal-date">New Renewal Date</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                    !renewalDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                  {renewalDate ? format(new Date(renewalDate), "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="flex items-center justify-between p-3 border-b">
                            <div className="flex items-center gap-2">
                              <Select
                                value={currentMonth.getMonth().toString()}
                                onValueChange={(month) => {
                                  console.log('=== MONTH CHANGE DEBUG ===');
                                  console.log('Selected month:', month);
                                  const newDate = new Date(currentMonth.getFullYear(), parseInt(month));
                                  console.log('New date for currentMonth:', newDate);
                                  setCurrentMonth(newDate);
                                  // Update renewalDate to match the new month/year
                                  if (renewalDate) {
                                    const currentSelectedDate = new Date(renewalDate);
                                    const updatedDate = new Date(newDate.getFullYear(), newDate.getMonth(), currentSelectedDate.getDate());
                                    console.log('Current selected date:', currentSelectedDate);
                                    console.log('Updated date:', updatedDate);
                                    console.log('Setting renewalDate to:', format(updatedDate, "yyyy-MM-dd"));
                                    setRenewalDate(format(updatedDate, "yyyy-MM-dd"));
                                  }
                                  console.log('=== END MONTH CHANGE DEBUG ===');
                                }}
                              >
                                <SelectTrigger className="w-24 h-8 text-sm font-medium">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {format(new Date(2024, i), "MMM")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={currentMonth.getFullYear().toString()}
                                onValueChange={(year) => {
                                  console.log('=== YEAR CHANGE DEBUG ===');
                                  console.log('Selected year:', year);
                                  const newDate = new Date(parseInt(year), currentMonth.getMonth());
                                  console.log('New date for currentMonth:', newDate);
                                  setCurrentMonth(newDate);
                                  // Update renewalDate to match the new year
                                  if (renewalDate) {
                                    const currentSelectedDate = new Date(renewalDate);
                                    const updatedDate = new Date(newDate.getFullYear(), newDate.getMonth(), currentSelectedDate.getDate());
                                    console.log('Current selected date:', currentSelectedDate);
                                    console.log('Updated date:', updatedDate);
                                    console.log('Setting renewalDate to:', format(updatedDate, "yyyy-MM-dd"));
                                    setRenewalDate(format(updatedDate, "yyyy-MM-dd"));
                                  }
                                  console.log('=== END YEAR CHANGE DEBUG ===');
                                }}
                              >
                                <SelectTrigger className="w-20 h-8 text-sm font-medium">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 20 }, (_, i) => {
                                    const year = new Date().getFullYear() - 10 + i;
                                    return (
                                      <SelectItem key={year} value={year.toString()}>
                                        {year}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentMonth(new Date())}
                              className="h-8 px-3 text-sm font-medium"
                            >
                              Today
                            </Button>
                          </div>
                          <Calendar
                            mode="single"
                            selected={renewalDate ? new Date(renewalDate) : undefined}
                            onSelect={(date) => {
                              console.log('=== CALENDAR DATE SELECTION DEBUG ===');
                              console.log('Selected date from calendar:', date);
                              if (date) {
                                const formattedDate = format(date, "yyyy-MM-dd");
                                console.log('Formatted date:', formattedDate);
                                console.log('Setting renewalDate to:', formattedDate);
                                setRenewalDate(formattedDate);
                                setDatePickerOpen(false);
                                console.log('Date picker closed');
                              }
                              console.log('=== END CALENDAR DATE SELECTION DEBUG ===');
                            }}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                  </div>
                  
          <DialogFooter className="flex gap-2">
                    <Button 
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
                    </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Renewal Date
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* No Changes Detected Modal */}
    <Dialog open={showNoChanges} onOpenChange={setShowNoChanges}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            No Changes Detected
          </DialogTitle>
          <DialogDescription>
            No changes were made to the vehicle renewal date.
            Would you like to continue editing?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleNoChangesCancel}
          >
            No
          </Button>
          <Button
            type="button"
            onClick={handleNoChangesContinue}
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmation Modal */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Confirm Renewal
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to renew vehicle {vehicleData?.plateNo} ({vehicleData?.fileNo})?
            <br />
            <br />
            <strong>Current Date:</strong> {vehicleData?.dateOfRenewal ? format(new Date(vehicleData.dateOfRenewal), "MMM dd, yyyy") : "Not set"}
                        <br />
            <strong>New Date:</strong> {renewalDate ? format(new Date(renewalDate), "MMM dd, yyyy") : "Not set"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleConfirmationCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmRenewal}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yes, Renew Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default VehicleRenewalModal;