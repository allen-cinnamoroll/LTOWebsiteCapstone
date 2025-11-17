import React, { useState, useEffect } from "react";
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
import { AlertTriangle } from "lucide-react";
import { saveFormData, loadFormData, clearFormData } from "@/util/formPersistence";

const FORM_STORAGE_KEY = 'accident_form_draft';

const AddAccidentModal = ({ open, onOpenChange, onAccidentAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const getDefaultValues = () => {
    const savedData = loadFormData(FORM_STORAGE_KEY);
    if (savedData) {
      return savedData;
    }
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

  // Watch form changes and save to localStorage
  const formValues = form.watch();
  useEffect(() => {
    if (open && !submitting) {
      // Only save if form has some data (not empty)
      const hasData = Object.values(formValues).some(value => {
        if (Array.isArray(value)) return value.some(v => v && v !== "");
        if (value instanceof Date) return true;
        return value !== "" && value !== undefined && value !== null;
      });
      
      if (hasData) {
        // Save with current connection status
        const isOffline = !navigator.onLine;
        saveFormData(FORM_STORAGE_KEY, formValues, isOffline);
      } else {
        // Clear saved data if form is empty (only if online)
        clearFormData(FORM_STORAGE_KEY, false);
      }
    }
  }, [formValues, open, submitting]);

  // Restore saved data when modal opens
  useEffect(() => {
    if (open) {
      const savedData = loadFormData(FORM_STORAGE_KEY);
      if (savedData) {
        form.reset(savedData);
      }
    }
  }, [open, form]);

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

        // Clear saved form data (force clear on successful submission)
        clearFormData(FORM_STORAGE_KEY, true);

        // Reset form
        form.reset({
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
        });

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

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // Only clear saved form data if internet is connected
      // If internet was disconnected, preserve the data
      clearFormData(FORM_STORAGE_KEY, false);
      
      // Reset form when closing modal
      form.reset({
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
      });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Add New Incident
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields to add a new incident record to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-start gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
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
