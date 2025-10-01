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
import { VehicleSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { Car } from "lucide-react";

const AddVehicleModal = ({ open, onOpenChange, onVehicleAdded }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(VehicleSchema),
    defaultValues: {
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
    },
  });

  const onSubmit = async (formData) => {
    // Debug: Log the received form data
    console.log('Received form data in AddVehicleModal:', formData);
    console.log('Owner name:', formData.ownerName);
    
    // Show confirmation modal instead of submitting directly
    setConfirmationData(formData);
    setShowConfirmation(true);
  };

  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      const formData = confirmationData;
      
      // Debug: Log the form data to see if vehicleStatusType is present
      console.log('Form data in handleConfirmSubmission:', formData);
      console.log('vehicleStatusType in formData:', formData.vehicleStatusType);
      
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        engineNo: formData.engineNo,
        chassisNo: formData.chassisNo,
        make: formData.make,
        bodyType: formData.bodyType,
        color: formData.color,
        classification: formData.classification,
        vehicleStatusType: formData.vehicleStatusType,
        driver: formData.driver
      };

      // Only include dateOfRenewal if it has a value
      if (formData.dateOfRenewal) {
        content.dateOfRenewal = formData.dateOfRenewal;
      }

      // Debug: Log the content being sent to API
      console.log('Content being sent to API:', content);
      console.log('vehicleStatusType in content:', content.vehicleStatusType);

      const { data } = await apiClient.post("/vehicle", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Vehicle has been added", {
          description: date,
        });

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
      console.log(error);
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
      // Reset form when closing modal
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
              className="flex items-center gap-2 min-w-[120px] bg-black hover:bg-gray-800 text-white shadow-lg"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
              {submitting ? "Adding..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-lg border border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Confirm Vehicle Information
          </DialogTitle>
          <DialogDescription>
            Please review the vehicle information before submitting.
          </DialogDescription>
        </DialogHeader>

        {confirmationData && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Vehicle Details</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Plate No:</div>
                  <div className="col-span-3">{confirmationData.plateNo}</div>
                  
                  <div className="font-medium text-gray-600">File No:</div>
                  <div className="col-span-3">{confirmationData.fileNo || 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600">Engine No:</div>
                  <div className="col-span-3">{confirmationData.engineNo}</div>
                  
                  <div className="font-medium text-gray-600">Chassis No:</div>
                  <div className="col-span-3">{confirmationData.chassisNo}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Vehicle Specifications</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Make:</div>
                  <div className="col-span-3">{confirmationData.make}</div>
                  
                  <div className="font-medium text-gray-600">Body Type:</div>
                  <div className="col-span-3">{confirmationData.bodyType}</div>
                  
                  <div className="font-medium text-gray-600">Color:</div>
                  <div className="col-span-3">{confirmationData.color}</div>
                  
                  <div className="font-medium text-gray-600">Classification:</div>
                  <div className="col-span-3">{confirmationData.classification}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Renewal</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Date of Renewal:</div>
                  <div className="col-span-3">{confirmationData.dateOfRenewal ? new Date(confirmationData.dateOfRenewal).toLocaleDateString() : 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600">Vehicle Status:</div>
                  <div className="col-span-3">{confirmationData.vehicleStatusType || 'Not selected'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Owner</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Owner Name:</div>
                  <div className="col-span-3">{confirmationData.ownerName || 'Not selected'}</div>
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
            className="min-w-[100px] bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
