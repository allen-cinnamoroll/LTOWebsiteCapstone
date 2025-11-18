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
import { CreateDriverSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { User, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EditDriverModal = ({ open, onOpenChange, driverData, onDriverUpdated, onCancel }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNoChanges, setShowNoChanges] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const { token } = useAuth();
  const date = formatDate(Date.now());
  const navigate = useNavigate();

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
    mode: "onChange",
  });

  // Populate form with driver data when modal opens
  useEffect(() => {
    if (open && driverData) {
      // Extract plate numbers and file numbers from vehicleIds
      const plateNumbers = driverData.vehicleIds?.map(vehicle => vehicle.plateNo).filter(Boolean) || [];
      const fileNumbers = driverData.vehicleIds?.map(vehicle => vehicle.fileNo).filter(Boolean) || [];
      
      const formData = {
        plateNo: plateNumbers.length > 0 ? plateNumbers : "",
        fileNo: fileNumbers.length > 0 ? fileNumbers.join(", ") : "",
        ownerRepresentativeName: driverData.ownerRepresentativeName || "",
        purok: driverData.address?.purok || "",
        barangay: driverData.address?.barangay || "",
        municipality: driverData.address?.municipality || "",
        province: driverData.address?.province || "Davao Oriental",
        contactNumber: driverData.contactNumber || "",
        emailAddress: driverData.emailAddress || "",
        hasDriversLicense: driverData.hasDriversLicense || false,
        driversLicenseNumber: driverData.driversLicenseNumber || "",
        birthDate: driverData.birthDate ? new Date(driverData.birthDate) : undefined,
      };
      
      form.reset(formData);
      
      // Also set values individually to ensure they're set
      setTimeout(() => {
        if (formData.plateNo) {
          form.setValue("plateNo", formData.plateNo, { shouldValidate: true, shouldDirty: true });
        }
        if (formData.fileNo) {
          form.setValue("fileNo", formData.fileNo, { shouldValidate: true, shouldDirty: true });
        }
        if (formData.municipality) {
          form.setValue("municipality", formData.municipality, { shouldValidate: true, shouldDirty: true });
        }
        if (formData.barangay) {
          form.setValue("barangay", formData.barangay, { shouldValidate: true, shouldDirty: true });
        }
        if (formData.purok) {
          form.setValue("purok", formData.purok, { shouldValidate: true, shouldDirty: true });
        }
      }, 200);
    }
  }, [open, driverData, form]);

  // Function to check if there are any changes
  const checkForChanges = (currentFormValues) => {
    if (!driverData) return false;
    
    const originalData = {
      ownerRepresentativeName: driverData.ownerRepresentativeName || "",
      purok: driverData.address?.purok || "",
      barangay: driverData.address?.barangay || "",
      municipality: driverData.address?.municipality || "",
      province: driverData.address?.province || "Davao Oriental",
      contactNumber: driverData.contactNumber || "",
      emailAddress: driverData.emailAddress || "",
      hasDriversLicense: driverData.hasDriversLicense || false,
      driversLicenseNumber: driverData.driversLicenseNumber || "",
      birthDate: driverData.birthDate ? new Date(driverData.birthDate) : undefined,
    };

    // Compare each field
    for (const key in originalData) {
      if (key === 'birthDate') {
        const originalDate = originalData[key];
        const currentDate = currentFormValues[key];
        if (originalDate && currentDate) {
          if (originalDate.getTime() !== currentDate.getTime()) return true;
        } else if (originalDate !== currentDate) {
          return true;
        }
      } else if (originalData[key] !== currentFormValues[key]) {
        return true;
      }
    }
    
    return false;
  };

  const onSubmit = async (formData) => {
    // Get the current form values directly
    const currentFormValues = form.getValues();
    
    // Check if there are any changes
    const hasChanges = checkForChanges(currentFormValues);
    
    if (!hasChanges) {
      // No changes detected, show "No Changes" modal
      setShowNoChanges(true);
      onOpenChange(false);
      return;
    }
    
    // Manual validation for required fields
    const errors = [];
      
    // Validate owner name
    if (!currentFormValues.ownerRepresentativeName || currentFormValues.ownerRepresentativeName.trim() === '') {
      errors.push("Owner/Representative name is required");
    }
    
    // Validate address fields
    if (!currentFormValues.barangay || currentFormValues.barangay.trim() === '') {
      errors.push("Barangay is required");
    }
    if (!currentFormValues.municipality || currentFormValues.municipality.trim() === '') {
      errors.push("Municipality is required");
    }
    if (!currentFormValues.province || currentFormValues.province.trim() === '') {
      errors.push("Province is required");
    }
    
    // Validate driver's license
    if (currentFormValues.hasDriversLicense && (!currentFormValues.driversLicenseNumber || currentFormValues.driversLicenseNumber.trim() === '')) {
      errors.push("Driver's license number is required when you have a driver's license");
    }
    
    // Validate email format if provided
    if (currentFormValues.emailAddress && currentFormValues.emailAddress.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentFormValues.emailAddress)) {
        errors.push("Invalid email format");
      }
    }
    
    if (errors.length > 0) {
      toast.error("Please fill in all required fields", {
        description: errors.join(", ")
      });
      return;
    }
    
    // Show confirmation modal instead of submitting directly
    setConfirmationData(currentFormValues);
    setShowConfirmation(true);
    // Close the main dialog to prevent nested modals
    onOpenChange(false);
  };

  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      // Validate required data before proceeding
      if (!driverData || !driverData._id) {
        toast.error("Invalid owner data", {
          description: "Owner information is missing or invalid."
        });
        return;
      }

      if (!confirmationData) {
        toast.error("No data to update", {
          description: "Please try editing the owner again."
        });
        return;
      }

      const currentFormValues = confirmationData;
      
      const content = {
        ownerRepresentativeName: currentFormValues.ownerRepresentativeName,
        address: {
          purok: currentFormValues.purok,
          barangay: currentFormValues.barangay,
          municipality: currentFormValues.municipality,
          province: currentFormValues.province,
        },
        contactNumber: currentFormValues.contactNumber,
        emailAddress: currentFormValues.emailAddress,
        hasDriversLicense: currentFormValues.hasDriversLicense,
        driversLicenseNumber: currentFormValues.driversLicenseNumber,
      };

      // Only include birthDate if it has a value
      if (currentFormValues.birthDate) {
        content.birthDate = currentFormValues.birthDate;
      }

      const { data } = await apiClient.patch(`/owner/${driverData._id}`, content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        // Since the server doesn't return the updated driver data,
        // we need to fetch it or use the original driver data with updates
        if (onDriverUpdated) {
          // Create updated driver data by merging the form data with original driver data
          const updatedDriver = {
            ...driverData, // Start with original driver data
            ownerRepresentativeName: confirmationData.ownerRepresentativeName,
            address: {
              purok: confirmationData.purok,
              barangay: confirmationData.barangay,
              municipality: confirmationData.municipality,
              province: confirmationData.province,
            },
            contactNumber: confirmationData.contactNumber,
            emailAddress: confirmationData.emailAddress,
            hasDriversLicense: confirmationData.hasDriversLicense,
            driversLicenseNumber: confirmationData.driversLicenseNumber,
            birthDate: confirmationData.birthDate,
          };
          
          onDriverUpdated(updatedDriver);
        }
        onOpenChange(false);
        
        // Show success message
        toast.success("Owner updated successfully", {
          description: "The owner information has been updated."
        });
        
        // Navigate to owners page after successful update
        navigate('/owner');
      }
    } catch (error) {
      let message = "Failed to update owner";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
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

  const handleCancel = () => {
    // If onCancel is provided, call it to return to details modal
    // Otherwise, just close the modal
    if (onCancel) {
      onCancel();
    } else {
    handleOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar]:bg-transparent animate-in fade-in-0 zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Owner
            </DialogTitle>
            <DialogDescription>
              Update the owner information. Plate number and file number cannot be modified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <FormComponent
              form={form}
              onSubmit={onSubmit}
              submitting={submitting}
              onCancel={handleCancel}
              isEditMode={true}
            />
          </div>

          <DialogFooter className="flex justify-start gap-3 pt-6">
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
              form="driver-form"
              disabled={submitting}
              className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
              {submitting ? "Updating..." : "Update Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={(isOpen) => {
        setShowConfirmation(isOpen);
        if (!isOpen) {
          // If confirmation is closed, also close the main dialog
          onOpenChange(false);
        }
      }}>
        <DialogContent className="max-w-lg border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Confirm Driver Information
          </DialogTitle>
          <DialogDescription>
            Please review the updated driver information before submitting.
          </DialogDescription>
        </DialogHeader>

        {confirmationData && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Vehicle Information (Read-only)</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Plate No:</div>
                  <div className="col-span-3">{Array.isArray(confirmationData.plateNo) ? confirmationData.plateNo.join(', ') : confirmationData.plateNo}</div>
                  
                  <div className="font-medium text-gray-600">File No:</div>
                  <div className="col-span-3 break-all text-xs">{confirmationData.fileNo || 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600">Owner:</div>
                  <div className="col-span-3">{confirmationData.ownerRepresentativeName}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Personal Information</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Contact:</div>
                  <div className="col-span-3">{confirmationData.contactNumber || 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600">Email:</div>
                  <div className="col-span-3">{confirmationData.emailAddress || 'Not provided'}</div>
                  
                  <div className="font-medium text-gray-600">Birth Date:</div>
                  <div className="col-span-3">{confirmationData.birthDate ? new Date(confirmationData.birthDate).toLocaleDateString() : 'Not provided'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Address Information</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Province:</div>
                  <div className="col-span-3">{confirmationData.province}</div>
                  
                  <div className="font-medium text-gray-600">Municipality:</div>
                  <div className="col-span-3">{confirmationData.municipality}</div>
                  
                  <div className="font-medium text-gray-600">Barangay:</div>
                  <div className="col-span-3">{confirmationData.barangay}</div>
                  
                  <div className="font-medium text-gray-600">Purok:</div>
                  <div className="col-span-3">{confirmationData.purok || 'Not provided'}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Driver's License</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Has License:</div>
                  <div className="col-span-3">{confirmationData.hasDriversLicense ? 'Yes' : 'No'}</div>
                  
                  {confirmationData.hasDriversLicense && (
                    <>
                      <div className="font-medium text-gray-600">License Number:</div>
                      <div className="col-span-3">{confirmationData.driversLicenseNumber}</div>
                    </>
                  )}
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
              // Reopen the main dialog to allow editing
              onOpenChange(true);
              // Clear any validation errors when cancelling
              form.clearErrors();
            }}
            disabled={submitting}
            className="min-w-[100px] bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Back to Edit
          </Button>
          <Button
            onClick={handleConfirmSubmission}
            disabled={submitting}
            className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Updating..." : "Confirm & Update Owner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* No Changes Modal */}
    <Dialog open={showNoChanges} onOpenChange={(isOpen) => {
      setShowNoChanges(isOpen);
      if (!isOpen) {
        // If no changes modal is closed, also close the main dialog
        onOpenChange(false);
      }
    }}>
      <DialogContent className="max-w-md border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            No Changes Detected
          </DialogTitle>
          <DialogDescription>
            No changes were made to the driver information. Would you like to continue editing?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowNoChanges(false);
              // Navigate to owners table
              navigate('/owner');
            }}
            className="min-w-[100px] bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            No
          </Button>
          <Button
            onClick={() => {
              setShowNoChanges(false);
              // Reopen the main dialog to allow editing
              onOpenChange(true);
            }}
            className="flex items-center gap-2 min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EditDriverModal;
