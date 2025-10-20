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
import { EditVehicleSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { Car } from "lucide-react";
import NoChangesModal from "./NoChangesModal";

const EditVehicleModal = ({ open, onOpenChange, vehicleId, onVehicleUpdated }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [vehicleData, setVehicleData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [noChangesModalOpen, setNoChangesModalOpen] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(EditVehicleSchema),
    defaultValues: {
      plateNo: "",
      fileNo: "",
      engineNo: "",
      chassisNo: "",
      make: "",
      bodyType: "",
      color: "",
      classification: undefined,
      vehicleStatusType: "",
      dateOfRenewal: undefined,
      driver: "",
      ownerName: "",
    },
  });

  const { reset } = form;

  // Fetch vehicle data when modal opens
  useEffect(() => {
    if (open && vehicleId) {
      fetchVehicleData();
    }
  }, [open, vehicleId, token]);

  // Update form when vehicleData changes
  useEffect(() => {
    if (Object.keys(vehicleData).length > 0) {
      reset(vehicleData);
    }
  }, [vehicleData, reset]);

  const fetchVehicleData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/vehicle/${vehicleId}`, {
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        // Debug: Log the classification value from database
        console.log('Classification from database:', data.data?.classification);
        console.log('Full vehicle data:', data.data);
        
        // Map database classification values to form values
        const mapClassification = (dbValue) => {
          if (!dbValue) return undefined;
          const mapping = {
            'PRIVATE': 'Private',
            'FOR HIRE': 'For Hire', 
            'GOVERNMENT': 'Government',
            'Private': 'Private',
            'For Hire': 'For Hire',
            'Government': 'Government'
          };
          return mapping[dbValue] || dbValue;
        };
        
        const vData = {
          plateNo: data.data?.plateNo || "",
          fileNo: data.data?.fileNo || "",
          engineNo: data.data?.engineNo || "",
          chassisNo: data.data?.serialChassisNumber || "",
          make: data.data?.make || "",
          bodyType: data.data?.bodyType || "",
          color: data.data?.color || "",
          classification: mapClassification(data.data?.classification),
          vehicleStatusType: data.data?.vehicleStatusType || "Old",
          dateOfRenewal: data.data?.dateOfRenewal ? new Date(data.data.dateOfRenewal) : undefined,
          driver: data.data?.driverId?._id || "",
          ownerName: data.data?.driverId?.ownerRepresentativeName || "No driver assigned",
        };
        setVehicleData(vData);
        setOriginalData(vData);
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load vehicle data", {
        description: date,
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to check if there are any changes
  const hasChanges = (formData) => {
    const currentData = {
      plateNo: formData.plateNo,
      engineNo: formData.engineNo,
      chassisNo: formData.chassisNo,
      make: formData.make,
      bodyType: formData.bodyType,
      color: formData.color,
      classification: formData.classification,
      vehicleStatusType: formData.vehicleStatusType,
      driver: formData.driver,
    };

    const original = {
      plateNo: originalData.plateNo,
      engineNo: originalData.engineNo,
      chassisNo: originalData.chassisNo,
      make: originalData.make,
      bodyType: originalData.bodyType,
      color: originalData.color,
      classification: originalData.classification,
      vehicleStatusType: originalData.vehicleStatusType,
      driver: originalData.driver,
    };

    return JSON.stringify(currentData) !== JSON.stringify(original);
  };

  const onSubmit = async (formData) => {
    // Check if there are any changes
    if (!hasChanges(formData)) {
      setNoChangesModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        engineNo: formData.engineNo,
        serialChassisNumber: formData.chassisNo,
        make: formData.make,
        bodyType: formData.bodyType,
        color: formData.color,
        classification: formData.classification,
        vehicleStatusType: formData.vehicleStatusType,
        // Only include driverId if it's provided and different from original
        ...(formData.driver && formData.driver !== originalData.driver && { driverId: formData.driver }),
      };

      const { data } = await apiClient.patch(`/vehicle/${vehicleId}`, content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Vehicle updated successfully", {
          description: date,
        });
        
        onOpenChange(false);
        if (onVehicleUpdated) {
          onVehicleUpdated();
        }
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "An error occurred";
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
        vehicleStatusType: "",
        dateOfRenewal: undefined,
        driver: "",
        ownerName: "",
      });
      setVehicleData({});
    }
    onOpenChange(isOpen);
  };

  const handleNoChangesContinue = () => {
    // If 'Yes' is clicked, close only the NoChangesModal, keep EditVehicleModal open
    setNoChangesModalOpen(false);
  };

  const handleNoChangesCancel = () => {
    // If 'No' is clicked, close both NoChangesModal and EditVehicleModal
    setNoChangesModalOpen(false);
    onOpenChange(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Edit Vehicle
            </DialogTitle>
            <DialogDescription>
              Loading vehicle data...
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
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Edit Vehicle
            </DialogTitle>
            <DialogDescription>
              Fill in the required fields to edit vehicle information.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1 py-2">
            <FormComponent
              form={form}
              onSubmit={onSubmit}
              submitting={submitting}
              hideDateOfRenewal={false}
              isEditMode={true}
              readOnlyFields={['fileNo', 'dateOfRenewal']}
              prePopulatedOwner={vehicleData.ownerName}
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
              {submitting ? "Updating..." : "Update Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Changes Modal */}
      <NoChangesModal
        open={noChangesModalOpen}
        onOpenChange={setNoChangesModalOpen}
        onContinue={handleNoChangesContinue}
        onCancel={handleNoChangesCancel}
      />
    </>
  );
};

export default EditVehicleModal;
