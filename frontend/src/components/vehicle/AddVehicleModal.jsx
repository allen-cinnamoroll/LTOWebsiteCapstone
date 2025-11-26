import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormComponent from "./FormComponent";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { VehicleSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { Car, WifiOff, Wifi, Trash2 } from "lucide-react";
import { saveFormData, loadFormData, clearFormData, loadFormMetadata } from "@/util/formPersistence";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const FORM_STORAGE_KEY = 'vehicle_form_draft';

const AddVehicleModal = ({ open, onOpenChange, onVehicleAdded, onAddNewOwner, formData, setFormData }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const { token } = useAuth();
  const date = formatDate(Date.now());
  const prevOpenRef = useRef(false);
  const { isOnline, wasOffline } = useOnlineStatus();
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  const [hasShownRestoredToast, setHasShownRestoredToast] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const getDefaultValues = () => {
    // Helper function to check if formData has actual meaningful data
    const hasActualData = (data) => {
      if (!data) return false;
      return Object.values(data).some(value => {
        if (Array.isArray(value)) return value.some(v => v && v !== "");
        if (value instanceof Date) return true;
        return value !== "" && value !== undefined && value !== null;
      });
    };

    // Check localStorage first for saved draft (priority for offline saves)
    const savedData = loadFormData(FORM_STORAGE_KEY);
    if (savedData && hasActualData(savedData)) {
      return savedData;
    }

    // Then check formData from parent (for transitions like Add Owner flow)
    if (formData && hasActualData(formData)) {
      return formData;
    }

    // Finally, return empty defaults
    return {
      plateNo: "",
      fileNo: "",
      engineNo: "",
      chassisNo: "",
      make: "",
      bodyType: "",
      color: "",
      classification: undefined,
      dateOfRenewal: undefined,
      vehicleStatusType: "",
      driver: "",
    };
  };

  const form = useForm({
    resolver: zodResolver(VehicleSchema),
    defaultValues: getDefaultValues(),
  });

  // Handle online/offline status changes
  useEffect(() => {
    if (!open) return;

    // When going offline, show notification
    if (!isOnline && !hasShownOfflineToast) {
      toast.info("You're offline", {
        description: "Your form data will be saved automatically and restored when you reconnect.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: 5000,
      });
      setHasShownOfflineToast(true);
    }

    // When coming back online
    if (isOnline && hasShownOfflineToast) {
      toast.success("You're back online", {
        description: "Your form data has been preserved.",
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000,
      });
      setHasShownOfflineToast(false);
    }
  }, [isOnline, open, hasShownOfflineToast]);

  // Watch form changes and sync to parent state
  const formValues = form.watch();
  useEffect(() => {
    if (open && !submitting && setFormData) {
      // Sync form values to parent state for persistence across modal transitions
      setFormData(formValues);
      
      // ONLY save to localStorage when OFFLINE
      // When online, we don't need to persist data (user can resubmit normally)
      if (!isOnline) {
        const hasData = Object.values(formValues).some(value => {
          if (Array.isArray(value)) return value.some(v => v && v !== "");
          if (value instanceof Date) return true;
          return value !== "" && value !== undefined && value !== null;
        });
        
        if (hasData) {
          // Save with metadata indicating saved while offline
          saveFormData(FORM_STORAGE_KEY, formValues, {
            savedWhileOffline: true,
          });
        } else {
          clearFormData(FORM_STORAGE_KEY);
        }
      }
    }
  }, [formValues, open, submitting, setFormData, isOnline]);

  // Check for saved draft data whenever modal opens or form values change
  useEffect(() => {
    if (open) {
      const savedData = loadFormData(FORM_STORAGE_KEY);
      const hasData = savedData && Object.values(savedData).some(value => {
        if (Array.isArray(value)) return value.some(v => v && v !== "");
        if (value instanceof Date) return true;
        return value !== "" && value !== undefined && value !== null;
      });
      setHasSavedDraft(hasData);
    }
  }, [open, formValues]);

  // Restore form data when modal opens (from localStorage or parent state)
  // Only reset when modal first opens, not when formData changes while modal is already open
  useEffect(() => {
    // Only reset when modal transitions from closed to open
    if (open && !prevOpenRef.current) {
      // Helper function to check if data has actual values
      const hasActualData = (data) => {
        if (!data) return false;
        return Object.values(data).some(value => {
          if (Array.isArray(value)) return value.some(v => v && v !== "");
          if (value instanceof Date) return true;
          return value !== "" && value !== undefined && value !== null;
        });
      };

      // Priority: localStorage (for offline saves) > parent formData > empty defaults
      const savedData = loadFormData(FORM_STORAGE_KEY);
      const dataToUse = hasActualData(savedData) ? savedData : 
                        hasActualData(formData) ? formData : null;
      
      if (dataToUse) {
        form.reset(dataToUse);
        
        // Check if data was saved while offline
        const metadata = loadFormMetadata(FORM_STORAGE_KEY);
        if (metadata && metadata.savedWhileOffline && !hasShownRestoredToast) {
          toast.info("Unsaved data restored", {
            description: "Your form data from when you were offline has been restored.",
            icon: <Car className="h-4 w-4" />,
            duration: 5000,
          });
          setHasShownRestoredToast(true);
        }
      }
    }
    // Update ref to track current open state
    prevOpenRef.current = open;
  }, [open, form, formData, hasShownRestoredToast]);

  const onSubmit = async (formData) => {
    // Show confirmation modal instead of submitting directly
    setConfirmationData(formData);
    setShowConfirmation(true);
  };

  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      const formData = confirmationData;
      
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        engineNo: formData.engineNo,
        serialChassisNumber: formData.chassisNo, // Map chassisNo to serialChassisNumber
        make: formData.make,
        bodyType: formData.bodyType,
        color: formData.color,
        classification: formData.classification,
        vehicleStatusType: formData.vehicleStatusType,
        ownerId: formData.driver // Map driver to ownerId
      };

      // Only include dateOfRenewal if it has a value
      if (formData.dateOfRenewal) {
        content.dateOfRenewal = formData.dateOfRenewal;
      }

      const { data } = await apiClient.post("/vehicle", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Vehicle has been added", {
          description: date,
        });

        // Clear saved form data
        clearFormData(FORM_STORAGE_KEY);
        
        // Clear parent form data state
        if (setFormData) {
          setFormData({
            plateNo: "",
            fileNo: "",
            engineNo: "",
            chassisNo: "",
            make: "",
            bodyType: "",
            color: "",
            classification: undefined,
            dateOfRenewal: undefined,
            vehicleStatusType: "",
            driver: "",
          });
        }

        // Reset form
        form.reset({
          plateNo: "",
          fileNo: "",
          engineNo: "",
          chassisNo: "",
          make: "",
          bodyType: "",
          color: "",
          classification: undefined,
          dateOfRenewal: undefined,
          vehicleStatusType: "",
          driver: "",
        });

        // Reset toast flags
        setHasShownRestoredToast(false);
        setHasShownOfflineToast(false);

        // Close modal and refresh data
        onOpenChange(false);
        if (onVehicleAdded) {
          onVehicleAdded();
        }
      }
    } catch (error) {
      const message = error.response?.data?.message || "Failed to add vehicle";
      toast.error(message, {
        description: date,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDraft = () => {
    // Clear saved form data
    clearFormData(FORM_STORAGE_KEY);
    
    // Reset form to empty values
    const emptyValues = {
      plateNo: "",
      fileNo: "",
      engineNo: "",
      chassisNo: "",
      make: "",
      bodyType: "",
      color: "",
      classification: undefined,
      dateOfRenewal: undefined,
      vehicleStatusType: "",
      driver: "",
    };
    
    form.reset(emptyValues);
    
    // Clear parent form data state
    if (setFormData) {
      setFormData(emptyValues);
    }
    
    // Reset flags
    setHasShownRestoredToast(false);
    setHasSavedDraft(false);
    
    // Show confirmation toast
    toast.info("Draft cleared", {
      description: "All unsaved form data has been removed.",
      duration: 3000,
    });
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // If closing while ONLINE, clear the form data and localStorage
      // If closing while OFFLINE, keep the saved data for restoration
      if (isOnline) {
        // Clear saved form data when closing while online
        clearFormData(FORM_STORAGE_KEY);
        
        // Reset form to empty values
        const emptyValues = {
          plateNo: "",
          fileNo: "",
          engineNo: "",
          chassisNo: "",
          make: "",
          bodyType: "",
          color: "",
          classification: undefined,
          dateOfRenewal: undefined,
          vehicleStatusType: "",
          driver: "",
        };
        
        form.reset(emptyValues);
        
        // Clear parent form data state
        if (setFormData) {
          setFormData(emptyValues);
        }
      }
      // If offline, data is already saved and will be restored next time
      
      // Reset toast flags when closing
      setHasShownRestoredToast(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col overflow-hidden">
          {/* Offline Indicator Banner */}
          {!isOnline && (
            <div className="bg-amber-100 dark:bg-amber-600 px-4 py-2 flex items-center gap-2 text-sm border-b border-amber-200 dark:border-amber-700">
              <WifiOff className="h-4 w-4 flex-shrink-0 text-amber-900 dark:text-white" />
              <span className="flex-1 text-amber-900 dark:text-white">
                <strong className="text-amber-900 dark:text-white">You're offline.</strong> Your form data is being saved automatically and will be preserved.
              </span>
            </div>
          )}
          
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Add New Vehicle
            </DialogTitle>
            <DialogDescription>
              Fill in the required fields to add a new vehicle record to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1 py-2">
            <FormComponent
              form={form}
              onSubmit={onSubmit}
              submitting={submitting}
              onAddNewOwner={onAddNewOwner}
            />
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-between items-center gap-3 pt-4 border-t">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              {hasSavedDraft && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearDraft}
                  disabled={submitting}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Draft
                </Button>
              )}
            </div>
            <Button
              type="submit"
              form="vehicle-form"
              disabled={submitting}
              className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
              {submitting ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-lg border-0 dark:border-0 bg-white dark:bg-[#212121]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Confirm Vehicle Information
          </DialogTitle>
          <DialogDescription>
            Please review the vehicle information before submitting
          </DialogDescription>
        </DialogHeader>

        {confirmationData && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Vehicle Details</h4>
              <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600 dark:text-gray-400">Plate No:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.plateNo}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">File No:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.fileNo || 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">Engine No:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.engineNo}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">Chassis No:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.chassisNo}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Vehicle Specifications</h4>
              <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600 dark:text-gray-400">Make:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.make}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">Body Type:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.bodyType}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">Color:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.color}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">Classification:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.classification}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Renewal</h4>
              <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600 dark:text-gray-400">Date of Renewal:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.dateOfRenewal ? new Date(confirmationData.dateOfRenewal).toLocaleDateString() : 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600 dark:text-gray-400">Vehicle Status:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.vehicleStatusType || 'Not selected'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Owner</h4>
              <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600 dark:text-gray-400">Owner Name:</div>
                  <div className="col-span-3 text-gray-900 dark:text-gray-100">{confirmationData.ownerName || 'Not selected'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowConfirmation(false);
              // Clear any validation errors when cancelling
              form.clearErrors();
            }}
            disabled={submitting}
            className="min-w-[100px] bg-white dark:bg-[#212121] border-gray-300 dark:border-[#424242] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#171717]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmission}
            disabled={submitting}
            className="flex items-center gap-2 min-w-[120px] bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg border border-blue-600 relative overflow-hidden"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Adding..." : "Confirm & Add Vehicle"}
            {/* Page fold detail */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-blue-300 to-blue-500 transform rotate-45 translate-x-2 -translate-y-2 opacity-60"></div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AddVehicleModal;
