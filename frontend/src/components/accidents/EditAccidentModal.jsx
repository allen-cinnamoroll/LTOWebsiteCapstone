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

const EditAccidentModal = ({ open, onOpenChange, accidentId, onAccidentUpdated }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(AccidentSchema),
    defaultValues: {
      accident_id: "",
      plateNo: "",
      accident_date: undefined,
      street: "",
      barangay: "",
      municipality: "",
      vehicle_type: "",
      severity: "",
      notes: "",
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
          accident_id: accident.accident_id || "",
          plateNo: accident.plateNo || "",
          accident_date: accident.accident_date ? new Date(accident.accident_date) : undefined,
          street: accident.street || "",
          barangay: accident.barangay || "",
          municipality: accident.municipality || "",
          vehicle_type: accident.vehicle_type || "",
          severity: accident.severity || "",
          notes: accident.notes || "",
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
        accident_id: formData.accident_id,
        plateNo: formData.plateNo,
        accident_date: formData.accident_date ? formData.accident_date.toISOString() : null,
        street: formData.street,
        barangay: formData.barangay,
        municipality: formData.municipality,
        vehicle_type: formData.vehicle_type,
        severity: formData.severity,
        notes: formData.notes,
      };

      console.log("Updating accident data:", content);

      const { data } = await apiClient.patch(`/accident/${accidentId}`, content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Accident has been updated", { description: date });

        // Close modal and refresh data
        onOpenChange(false);
        if (onAccidentUpdated) {
          onAccidentUpdated();
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update accident";
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
        accident_id: "",
        plateNo: "",
        accident_date: undefined,
        street: "",
        barangay: "",
        municipality: "",
        vehicle_type: "",
        severity: "",
        notes: "",
      });
    }
    onOpenChange(isOpen);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Edit Accident
          </DialogTitle>
          <DialogDescription>
            Update the accident information. Accident ID cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
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
            {submitting ? "Updating..." : "Update Accident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccidentModal;
