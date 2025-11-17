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
import { VehicleSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { Car } from "lucide-react";
import { saveFormData, loadFormData, clearFormData } from "@/util/formPersistence";

const FORM_STORAGE_KEY = 'vehicle_form_draft';

const AddVehicleModal = ({ open, onOpenChange, onVehicleAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const getDefaultValues = () => {
    const savedData = loadFormData(FORM_STORAGE_KEY);
    if (savedData) {
      return savedData;
    }
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
        driverId: formData.driver // Map driver to driverId
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
          driver: "",
        });

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

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // Don't clear form data when closing - it will be restored next time
      // Only reset if user explicitly wants to discard (we'll keep the saved data)
    }
    onOpenChange(isOpen);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
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
