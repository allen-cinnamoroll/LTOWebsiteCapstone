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
import { Edit } from "lucide-react";

const EditViolationModal = ({ open, onOpenChange, violationId, onViolationUpdated }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [violationData, setViolationData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNoChangesModal, setShowNoChangesModal] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(ViolationCreateSchema),
    defaultValues: {
      topNo: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      violations: [],
      violationType: "confiscated",
      licenseType: undefined,
      plateNo: "",
      dateOfApprehension: undefined,
      apprehendingOfficer: "",
      chassisNo: "",
      engineNo: "",
    },
  });

  const { reset } = form;

  // Fetch violation data when modal opens
  useEffect(() => {
    if (open && violationId) {
      fetchViolationData();
    }
  }, [open, violationId, token]);

  // Update form when violationData changes
  useEffect(() => {
    if (Object.keys(violationData).length > 0) {
      reset(violationData);
    }
  }, [violationData, reset]);

  const fetchViolationData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/violations/${violationId}`, {
        headers: { Authorization: token },
      });
      
      if (data?.data) {
        const v = data.data;
        
        // Handle null/empty values - show "null" for null values, empty string for undefined
        const processedData = {
          topNo: v.topNo !== null ? v.topNo : "null",
          firstName: v.firstName !== null ? v.firstName : "null",
          middleInitial: v.middleInitial !== null ? v.middleInitial : "null",
          lastName: v.lastName !== null ? v.lastName : "null",
          suffix: v.suffix !== null ? v.suffix : "null",
          violations: v.violations && v.violations.length > 0 ? v.violations : [""],
          violationType: v.violationType || "confiscated",
          licenseType: v.licenseType !== null ? v.licenseType : undefined,
          plateNo: v.plateNo !== null ? v.plateNo : "null",
          dateOfApprehension: v.dateOfApprehension ? new Date(v.dateOfApprehension) : undefined,
          apprehendingOfficer: v.apprehendingOfficer !== null ? v.apprehendingOfficer : "null",
          chassisNo: v.chassisNo !== null ? v.chassisNo : "null",
          engineNo: v.engineNo !== null ? v.engineNo : "null",
        };
        
        setViolationData(processedData);
        setOriginalData(processedData);
      }
    } catch (error) {
      console.error("Error fetching violation data:", error);
      toast.error("Failed to load violation data", { description: date });
    } finally {
      setLoading(false);
    }
  };

  const checkForChanges = (formData) => {
    // Compare current form data with original data
    const currentData = {
      topNo: formData.topNo,
      firstName: formData.firstName,
      middleInitial: formData.middleInitial,
      lastName: formData.lastName,
      suffix: formData.suffix,
      violations: formData.violations,
      violationType: formData.violationType,
      licenseType: formData.licenseType,
      plateNo: formData.plateNo,
      dateOfApprehension: formData.dateOfApprehension,
      apprehendingOfficer: formData.apprehendingOfficer,
      chassisNo: formData.chassisNo,
      engineNo: formData.engineNo,
    };

    // Deep comparison
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  };

  const handleUpdateClick = () => {
    const formData = form.getValues();
    if (checkForChanges(formData)) {
      setShowConfirmModal(true);
    } else {
      setShowNoChangesModal(true);
    }
  };

  const confirmUpdate = () => {
    setShowConfirmModal(false);
    form.handleSubmit(onSubmit)();
  };

  const cancelUpdate = () => {
    setShowConfirmModal(false);
  };

  const handleNoChangesContinue = () => {
    setShowNoChangesModal(false);
    // Keep the modal open for further editing
  };

  const handleNoChangesCancel = () => {
    setShowNoChangesModal(false);
    onOpenChange(false);
  };

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Prepare content based on violation type
      const content = {
        topNo: formData.topNo,
        violationType: formData.violationType,
        plateNo: formData.plateNo,
        dateOfApprehension: formData.dateOfApprehension,
        apprehendingOfficer: formData.apprehendingOfficer,
      };

      // Helper function to convert "null" strings back to null for database
      const convertNullStrings = (value) => {
        return value === "null" ? null : value;
      };

      // Add fields based on violation type
      if (formData.violationType === "confiscated") {
        content.firstName = convertNullStrings(formData.firstName);
        content.middleInitial = convertNullStrings(formData.middleInitial);
        content.lastName = convertNullStrings(formData.lastName);
        content.suffix = convertNullStrings(formData.suffix);
        content.violations = formData.violations ? formData.violations.filter(v => v.trim() !== "") : [];
        content.licenseType = convertNullStrings(formData.licenseType);
      } else if (formData.violationType === "impounded") {
        content.firstName = convertNullStrings(formData.firstName);
        content.middleInitial = convertNullStrings(formData.middleInitial);
        content.lastName = convertNullStrings(formData.lastName);
        content.suffix = convertNullStrings(formData.suffix);
        content.violations = formData.violations ? formData.violations.filter(v => v.trim() !== "") : [];
        content.licenseType = null;
      } else if (formData.violationType === "alarm") {
        // For alarm type, set all fields to null
        content.firstName = null;
        content.middleInitial = null;
        content.lastName = null;
        content.suffix = null;
        content.violations = null;
        content.licenseType = null;
      }

      const { data } = await apiClient.patch(`/violations/${violationId}`, content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Violation updated successfully", { description: date });
        onOpenChange(false);
        if (onViolationUpdated) {
          onViolationUpdated();
        }
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update violation";
      toast.error(message, { description: date });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // Reset form when closing modal
      form.reset({
        topNo: "",
        firstName: "",
        middleInitial: "",
        lastName: "",
        suffix: "",
        violations: [],
        violationType: "confiscated",
        licenseType: undefined,
        plateNo: "",
        dateOfApprehension: undefined,
        apprehendingOfficer: "",
        chassisNo: "",
        engineNo: "",
      });
    }
    onOpenChange(isOpen);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Violation
            </DialogTitle>
            <DialogDescription>
              Loading violation data...
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center">
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
            <Edit className="h-5 w-5" />
            Edit Violation
          </DialogTitle>
          <DialogDescription>
            Update violation details. All data is pre-filled from the existing record.
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
            type="button"
            onClick={handleUpdateClick}
            disabled={submitting}
            className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Updating..." : "Update Violation"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Update Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              Confirm Update
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to update this violation? This action will modify the existing record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={cancelUpdate}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmUpdate}
              className="min-w-[80px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Changes Modal */}
      <Dialog open={showNoChangesModal} onOpenChange={setShowNoChangesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              No Changes Detected
            </DialogTitle>
            <DialogDescription>
              No changes were made to the violation information. Would you like to continue editing?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleNoChangesCancel}
              className="min-w-[80px]"
            >
              No
            </Button>
            <Button
              type="button"
              onClick={handleNoChangesContinue}
              className="min-w-[80px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default EditViolationModal;
