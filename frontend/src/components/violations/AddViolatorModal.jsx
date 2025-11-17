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
import { ViolationCreateSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { saveFormData, loadFormData, clearFormData } from "@/util/formPersistence";

const FORM_STORAGE_KEY = 'violation_form_draft';

const AddViolatorModal = ({ open, onOpenChange, onViolationAdded, initialValues, searchTerm }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());


  const getDefaultValues = () => {
    const savedData = loadFormData(FORM_STORAGE_KEY);
    if (savedData) {
      return savedData;
    }
    return {
      topNo: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      violations: [""],
      violationType: "confiscated",
      licenseType: undefined,
      plateNo: "",
      dateOfApprehension: undefined,
      apprehendingOfficer: "",
      chassisNo: "",
      engineNo: "",
      fileNo: "",
    };
  };

  const form = useForm({
    resolver: zodResolver(ViolationCreateSchema),
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
        saveFormData(FORM_STORAGE_KEY, formValues);
      } else {
        // Clear saved data if form is empty
        clearFormData(FORM_STORAGE_KEY);
      }
    }
  }, [formValues, open, submitting]);


  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        topNo: formData.topNo,
        firstName: formData.firstName,
        middleInitial: formData.middleInitial,
        lastName: formData.lastName,
        suffix: formData.suffix,
        violations: formData.violations,
        violationType: formData.violationType,
        licenseType: formData.violationType === "confiscated" ? formData.licenseType : undefined,
        plateNo: formData.plateNo,
        apprehendingOfficer: formData.apprehendingOfficer,
        chassisNo: formData.chassisNo,
        engineNo: formData.engineNo,
      fileNo: formData.fileNo,
      };

      // Only include dateOfApprehension if it has a value
      if (formData.dateOfApprehension) {
        content.dateOfApprehension = formData.dateOfApprehension;
      }

      const { data } = await apiClient.post("/violations", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Violation has been added", {
          description: date,
        });

        // Clear saved form data
        clearFormData(FORM_STORAGE_KEY);

        // Reset form
        form.reset({
          topNo: "",
          firstName: "",
          middleInitial: "",
          lastName: "",
          suffix: "",
          violations: [""],
          violationType: "confiscated",
          licenseType: undefined,
          plateNo: "",
          dateOfApprehension: undefined,
          apprehendingOfficer: "",
          chassisNo: "",
          engineNo: "",
          fileNo: "",
        });

        // Close modal and refresh data
        onOpenChange(false);
        if (onViolationAdded) {
          onViolationAdded();
        }
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to add violation";
      toast.error(message, {
        description: date,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // Clear saved form data when closing modal (user clicked cancel or X)
      clearFormData(FORM_STORAGE_KEY);
      
      // Reset form when closing modal
      form.reset({
        topNo: "",
        firstName: "",
        middleInitial: "",
        lastName: "",
        suffix: "",
        violations: [""],
        violationType: "confiscated",
        licenseType: undefined,
        plateNo: "",
        dateOfApprehension: undefined,
        apprehendingOfficer: "",
        chassisNo: "",
        engineNo: "",
        fileNo: "",
      });
    }
    onOpenChange(isOpen);
  };

  // Apply initial values when opening - parse searchTerm if provided
  React.useEffect(() => {
    if (open) {
      let firstName = "";
      let lastName = "";
      
      // Parse searchTerm if provided
      if (searchTerm && searchTerm.trim()) {
        const nameParts = searchTerm.trim().split(/\s+/);
        if (nameParts.length === 1) {
          firstName = nameParts[0];
        } else if (nameParts.length >= 2) {
          lastName = nameParts[nameParts.length - 1];
          firstName = nameParts.slice(0, -1).join(" ");
        }
      }
      
      // Check for saved form data first (unless initialValues or searchTerm is provided)
      const savedData = loadFormData(FORM_STORAGE_KEY);
      
      // Use initialValues if provided, otherwise use parsed searchTerm, otherwise use saved data
      if (initialValues && initialValues.firstName) {
        form.reset({
          topNo: "",
          firstName: initialValues.firstName || "",
          middleInitial: initialValues.middleInitial || "",
          lastName: initialValues.lastName || "",
          suffix: initialValues.suffix || "",
          violations: [""],
          violationType: "confiscated",
          licenseType: undefined,
          plateNo: initialValues.plateNo || "",
          dateOfApprehension: undefined,
          apprehendingOfficer: "",
          chassisNo: initialValues.chassisNo || "",
          engineNo: initialValues.engineNo || "",
          fileNo: initialValues.fileNo || "",
        });
        // Clear saved data when using initialValues
        clearFormData(FORM_STORAGE_KEY);
      } else if (searchTerm && firstName) {
        // Use parsed name from searchTerm
        form.reset({
          topNo: "",
          firstName: firstName,
          middleInitial: "",
          lastName: lastName,
          suffix: "",
          violations: [""],
          violationType: "confiscated",
          licenseType: undefined,
          plateNo: "",
          dateOfApprehension: undefined,
          apprehendingOfficer: "",
          chassisNo: "",
          engineNo: "",
          fileNo: "",
        });
        // Clear saved data when using searchTerm
        clearFormData(FORM_STORAGE_KEY);
      } else if (savedData) {
        // Restore saved form data
        form.reset(savedData);
      } else {
        // Reset to empty form
        form.reset({
          topNo: "",
          firstName: "",
          middleInitial: "",
          lastName: "",
          suffix: "",
          violations: [""],
          violationType: "confiscated",
          licenseType: undefined,
          plateNo: "",
          dateOfApprehension: undefined,
          apprehendingOfficer: "",
          chassisNo: "",
          engineNo: "",
          fileNo: "",
        });
      }
    }
  }, [open, initialValues, searchTerm, form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Add New Violator
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields to add a new violator and violation record to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          {/* Main form */}
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
            isEditMode={false}
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
            form="violation-form"
            disabled={submitting}
            className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Adding..." : "Add Violator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddViolatorModal;

