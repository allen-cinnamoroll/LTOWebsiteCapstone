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
  const [confirmUpdateModalOpen, setConfirmUpdateModalOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
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
        
        // Safely resolve the latest valid renewal date from possible formats (array/object/string)
        const resolveLatestRenewalDate = (input) => {
          if (!input) return undefined;
          const toDate = (val) => {
            const raw = (val && typeof val === 'object' && 'date' in val) ? val.date : val;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
          };
          if (Array.isArray(input)) {
            const dates = input
              .map(toDate)
              .filter(Boolean)
              .sort((a, b) => b.getTime() - a.getTime());
            return dates.length ? dates[0] : undefined;
          }
          return toDate(input) || undefined;
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
          dateOfRenewal: resolveLatestRenewalDate(data.data?.dateOfRenewal),
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

    // Store form data and show confirmation modal
    setPendingFormData(formData);
    setConfirmUpdateModalOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!pendingFormData) return;

    setConfirmUpdateModalOpen(false);
    setIsSubmitting(true);
    
    try {
      const content = {
        plateNo: pendingFormData.plateNo,
        fileNo: pendingFormData.fileNo,
        engineNo: pendingFormData.engineNo,
        serialChassisNumber: pendingFormData.chassisNo,
        make: pendingFormData.make,
        bodyType: pendingFormData.bodyType,
        color: pendingFormData.color,
        classification: pendingFormData.classification,
        vehicleStatusType: pendingFormData.vehicleStatusType,
        // Only include driverId if it's provided and different from original
        ...(pendingFormData.driver && pendingFormData.driver !== originalData.driver && { driverId: pendingFormData.driver }),
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
      setPendingFormData(null);
    }
  };

  const handleCancelUpdate = () => {
    setConfirmUpdateModalOpen(false);
    setPendingFormData(null);
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

      {/* Confirmation Modal */}
      <Dialog open={confirmUpdateModalOpen} onOpenChange={setConfirmUpdateModalOpen}>
        <DialogContent className="max-w-lg border-0 dark:border-0 bg-white dark:bg-[#212121]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Confirm Vehicle Update
            </DialogTitle>
            <DialogDescription>
              Please review the updated vehicle information before submitting.
            </DialogDescription>
          </DialogHeader>

          {pendingFormData && (
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Vehicle Details</h4>
                <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="font-medium text-gray-600 dark:text-gray-400">Plate No:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.plateNo}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">File No:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.fileNo || 'Not provided'}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">Engine No:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.engineNo || 'Not provided'}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">Chassis No:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.chassisNo || 'Not provided'}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Vehicle Specifications</h4>
                <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="font-medium text-gray-600 dark:text-gray-400">Make:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.make}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">Body Type:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.bodyType}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">Color:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.color || 'Not provided'}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">Classification:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.classification}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Renewal</h4>
                <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="font-medium text-gray-600 dark:text-gray-400">Date of Renewal:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.dateOfRenewal ? new Date(pendingFormData.dateOfRenewal).toLocaleDateString() : 'Not provided'}</div>
                    
                    <div className="font-medium text-gray-600 dark:text-gray-400">Vehicle Status:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.vehicleStatusType || 'Not selected'}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-xs text-black dark:text-white mb-2 pl-3">Owner</h4>
                <div className="bg-gray-50 dark:bg-[#171717] rounded-md p-3 border border-gray-200 dark:border-[#424242]">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="font-medium text-gray-600 dark:text-gray-400">Owner Name:</div>
                    <div className="col-span-3 text-gray-900 dark:text-gray-100">{pendingFormData.ownerName || vehicleData.ownerName || 'Not selected'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelUpdate}
              disabled={submitting}
              className="min-w-[100px] bg-white dark:bg-[#212121] border-gray-300 dark:border-[#424242] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#171717]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpdate}
              disabled={submitting}
              className="flex items-center gap-2 min-w-[120px] bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg border border-blue-600 relative overflow-hidden"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
              {submitting ? "Updating..." : "Confirm & Update Vehicle"}
              {/* Page fold detail */}
              <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-blue-300 to-blue-500 transform rotate-45 translate-x-2 -translate-y-2 opacity-60"></div>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditVehicleModal;
