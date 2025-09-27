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
import { CreateDriverSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { User } from "lucide-react";

const AddDriverModal = ({ open, onOpenChange, onDriverAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(CreateDriverSchema),
    defaultValues: {
      plateNo: "",
      fileNo: "",
      ownerRepresentativeName: "",
      purok: "",
      barangay: "",
      municipality: "",
      province: "Davao Oriental",
      contactNumber: "",
      emailAddress: "",
      hasDriversLicense: false,
      driversLicenseNumber: "",
      birthDate: undefined,
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        ownerRepresentativeName: formData.ownerRepresentativeName,
        purok: formData.purok,
        barangay: formData.barangay,
        municipality: formData.municipality,
        province: formData.province,
        contactNumber: formData.contactNumber,
        emailAddress: formData.emailAddress,
        hasDriversLicense: formData.hasDriversLicense,
        driversLicenseNumber: formData.driversLicenseNumber,
      };

      // Only include birthDate if it has a value
      if (formData.birthDate) {
        content.birthDate = formData.birthDate;
      }

      const { data } = await apiClient.post("/driver", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Driver has been added", {
          description: date,
        });

        // Reset form
        form.reset({
          plateNo: "",
          fileNo: "",
          ownerRepresentativeName: "",
          purok: "",
          barangay: "",
          municipality: "",
          province: "Davao Oriental",
          contactNumber: "",
          emailAddress: "",
          hasDriversLicense: false,
          driversLicenseNumber: "",
          birthDate: undefined,
        });

        // Close modal and refresh data
        onOpenChange(false);
        if (onDriverAdded) {
          onDriverAdded();
        }
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to add driver";
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
        plateNo: "",
        fileNo: "",
        ownerRepresentativeName: "",
        purok: "",
        barangay: "",
        municipality: "",
        province: "Davao Oriental",
        contactNumber: "",
        emailAddress: "",
        hasDriversLicense: false,
        driversLicenseNumber: "",
        birthDate: undefined,
      });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar]:bg-transparent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New Driver
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields to add a new driver record to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="driver-form"
            disabled={submitting}
            className="flex items-center gap-2"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Adding..." : "Add Driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDriverModal;
