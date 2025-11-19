import React, { useState } from "react";
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
import { clearFormData } from "@/util/formPersistence";

const FORM_STORAGE_KEY = 'accident_form_draft';

const AddAccidentModal = ({ open, onOpenChange, onAccidentAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const getDefaultValues = () => {
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
      // Reset form when closing modal
      clearFormData(FORM_STORAGE_KEY);
      form.reset(emptyFormValues);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-slate-50 to-red-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col overflow-hidden">
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
