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
import { AccidentSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { AlertTriangle, WifiOff, Wifi, Trash2 } from "lucide-react";
import { saveFormData, loadFormData, clearFormData, loadFormMetadata } from "@/util/formPersistence";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const FORM_STORAGE_KEY = 'accident_form_draft';

const AddAccidentModal = ({ open, onOpenChange, onAccidentAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());
  const prevOpenRef = useRef(false);
  const { isOnline, wasOffline } = useOnlineStatus();
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  const [hasShownRestoredToast, setHasShownRestoredToast] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const getDefaultValues = () => {
    // Helper function to check if data has actual meaningful values
    const hasActualData = (data) => {
      if (!data) return false;
      return Object.values(data).some(value => {
        if (Array.isArray(value)) return value.some(v => v && v !== "");
        if (value instanceof Date) return true;
        return value !== "" && value !== undefined && value !== null;
      });
    };

    // Check localStorage for saved draft (priority for offline saves)
    const savedData = loadFormData(FORM_STORAGE_KEY);
    if (savedData && hasActualData(savedData)) {
      return savedData;
    }

    // Return empty defaults
    return {
      blotterNo: "",
      vehiclePlateNo: "",
      vehicleMCPlateNo: "",
      vehicleChassisNo: "",
      suspect: "",
      stageOfFelony: "",
      offense: "",
      offenseType: "",
      narrative: "",
      caseStatus: "",
      region: "",
      province: "",
      municipality: "",
      barangay: "",
      street: "",
      lat: undefined,
      lng: undefined,
      dateEncoded: undefined,
      dateReported: undefined,
      timeReported: "",
      dateCommited: undefined,
      timeCommited: "",
      incidentType: "",
    };
  };

  const form = useForm({
    resolver: zodResolver(AccidentSchema),
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

  // Watch form changes and save ONLY when offline
  const formValues = form.watch();
  useEffect(() => {
    if (open && !submitting) {
      // ONLY save to localStorage when OFFLINE
      if (!isOnline) {
        const hasData = Object.values(formValues).some(value => {
          if (Array.isArray(value)) return value.some(v => v && v !== "");
          if (value instanceof Date) return true;
          return value !== "" && value !== undefined && value !== null;
        });
        
        if (hasData) {
          saveFormData(FORM_STORAGE_KEY, formValues, {
            savedWhileOffline: true,
          });
        } else {
          clearFormData(FORM_STORAGE_KEY);
        }
      }
    }
  }, [formValues, open, submitting, isOnline]);

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

  // Restore form data when modal opens
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

      const savedData = loadFormData(FORM_STORAGE_KEY);
      
      if (savedData && hasActualData(savedData)) {
        form.reset(savedData);
        
        // Check if data was saved while offline
        const metadata = loadFormMetadata(FORM_STORAGE_KEY);
        if (metadata && metadata.savedWhileOffline && !hasShownRestoredToast) {
          toast.info("Unsaved data restored", {
            description: "Your form data from when you were offline has been restored.",
            icon: <AlertTriangle className="h-4 w-4" />,
            duration: 5000,
          });
          setHasShownRestoredToast(true);
        }
      }
    }
    // Update ref to track current open state
    prevOpenRef.current = open;
  }, [open, form, hasShownRestoredToast]);

  const emptyFormValues = {
    blotterNo: "",
    vehiclePlateNo: "",
    vehicleMCPlateNo: "",
    vehicleChassisNo: "",
    suspect: "",
    stageOfFelony: "",
    offense: "",
    offenseType: "",
    narrative: "",
    caseStatus: "",
    region: "",
    province: "",
    municipality: "",
    barangay: "",
    street: "",
    lat: undefined,
    lng: undefined,
    dateEncoded: undefined,
    dateReported: undefined,
    timeReported: "",
    dateCommited: undefined,
    timeCommited: "",
    incidentType: "",
  };

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        blotterNo: formData.blotterNo,
        vehiclePlateNo: formData.vehiclePlateNo,
        vehicleMCPlateNo: formData.vehicleMCPlateNo,
        vehicleChassisNo: formData.vehicleChassisNo,
        suspect: formData.suspect,
        stageOfFelony: formData.stageOfFelony,
        offense: formData.offense,
        offenseType: formData.offenseType,
        narrative: formData.narrative,
        caseStatus: formData.caseStatus,
        region: formData.region,
        province: formData.province,
        municipality: formData.municipality,
        barangay: formData.barangay,
        street: formData.street,
        lat: formData.lat,
        lng: formData.lng,
        dateEncoded: formData.dateEncoded ? formData.dateEncoded.toISOString() : null,
        dateReported: formData.dateReported ? formData.dateReported.toISOString() : null,
        timeReported: formData.timeReported,
        dateCommited: formData.dateCommited ? formData.dateCommited.toISOString() : null,
        timeCommited: formData.timeCommited,
        incidentType: formData.incidentType,
      };

      console.log("Sending incident data:", content);

      const { data } = await apiClient.post("/accident", content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Incident has been added", { description: date });

        // Clear saved form data
        clearFormData(FORM_STORAGE_KEY);

        // Reset form
        form.reset(emptyFormValues);

        // Reset toast flags
        setHasShownRestoredToast(false);
        setHasShownOfflineToast(false);

        // Close modal and refresh data
        onOpenChange(false);
        if (onAccidentAdded) {
          onAccidentAdded();
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to add incident";
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
    form.reset(emptyFormValues);
    
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
        form.reset(emptyFormValues);
      }
      // If offline, data is already saved and will be restored next time
      
      // Reset toast flags when closing
      setHasShownRestoredToast(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-slate-50 to-red-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col overflow-hidden">
        {/* Offline Indicator Banner */}
        {!isOnline && (
          <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">
              <strong>You're offline.</strong> Your form data is being saved automatically and will be preserved.
            </span>
          </div>
        )}
        
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Add New Incident
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields to add a new incident record to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-red-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-red-500">
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
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
            form="accident-form"
            disabled={submitting}
            className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Adding..." : "Add Accident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccidentModal;
