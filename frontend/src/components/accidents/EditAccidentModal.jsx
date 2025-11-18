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

const EditAccidentModal = ({ open, onOpenChange, accidentId, onAccidentUpdated, onCancel }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(AccidentSchema),
    defaultValues: {
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
    },
  });

  // Fetch accident data when modal opens
  useEffect(() => {
    if (open && accidentId) {
      fetchAccidentData();
    }
  }, [open, accidentId]);

  const fetchAccidentData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/accident/${accidentId}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success && data.data) {
        const accident = data.data;
        form.reset({
          blotterNo: accident.blotterNo || "",
          vehiclePlateNo: accident.vehiclePlateNo || "",
          vehicleMCPlateNo: accident.vehicleMCPlateNo || "",
          vehicleChassisNo: accident.vehicleChassisNo || "",
          suspect: accident.suspect || "",
          stageOfFelony: accident.stageOfFelony || "",
          offense: accident.offense || "",
          offenseType: accident.offenseType || "",
          narrative: accident.narrative || "",
          caseStatus: accident.caseStatus || "",
          region: accident.region || "",
          province: accident.province || "",
          municipality: accident.municipality || "",
          barangay: accident.barangay || "",
          street: accident.street || "",
          lat: accident.lat || undefined,
          lng: accident.lng || undefined,
          dateEncoded: accident.dateEncoded ? new Date(accident.dateEncoded) : undefined,
          dateReported: accident.dateReported ? new Date(accident.dateReported) : undefined,
          timeReported: accident.timeReported || "",
          dateCommited: accident.dateCommited ? new Date(accident.dateCommited) : undefined,
          timeCommited: accident.timeCommited || "",
          incidentType: accident.incidentType || "",
        });
      }
    } catch (error) {
      console.error("Error fetching accident:", error);
      toast.error("Failed to load accident data", {
        description: date,
      });
    } finally {
      setLoading(false);
    }
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

      console.log("Updating incident data:", content);

      const { data } = await apiClient.patch(`/accident/${accidentId}`, content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Incident has been updated", { description: date });

        // Close modal and refresh data
        onOpenChange(false);
        if (onAccidentUpdated) {
          onAccidentUpdated();
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update incident";
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
      <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-slate-50 to-red-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Edit Incident
          </DialogTitle>
          <DialogDescription>
            Update the accident information. Accident ID cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-red-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-red-500">
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
            isEditMode={true}
          />
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-start gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // If onCancel is provided, call it to return to details modal
              // Otherwise, just close the modal
              if (onCancel) {
                onCancel();
              } else {
                handleOpenChange(false);
              }
            }}
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
            {submitting ? "Updating..." : "Update Accident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccidentModal;
