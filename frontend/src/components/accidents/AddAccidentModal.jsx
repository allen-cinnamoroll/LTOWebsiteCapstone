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

const AddAccidentModal = ({ open, onOpenChange, onAccidentAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
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

      console.log("Sending accident data:", content);

      const { data } = await apiClient.post("/accident", content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Accident has been added", { description: date });

        // Reset form
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

        // Close modal and refresh data
        onOpenChange(false);
        if (onAccidentAdded) {
          onAccidentAdded();
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to add accident";
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Add New Accident
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields to add a new accident record to the system.
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
