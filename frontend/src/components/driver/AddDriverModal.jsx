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
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveFormData, loadFormData, clearFormData } from "@/util/formPersistence";

const FORM_STORAGE_KEY = 'driver_form_draft';

const AddDriverModal = ({ open, onOpenChange, onDriverAdded, onCancel }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const { token } = useAuth();
  const date = formatDate(Date.now());
  const navigate = useNavigate();

  const getDefaultValues = () => {
    const savedData = loadFormData(FORM_STORAGE_KEY);
    if (savedData) {
      return savedData;
    }
    return {
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
    };
  };

  const form = useForm({
    // Temporarily disable schema validation to use manual validation
    // resolver: zodResolver(CreateDriverSchema),
    defaultValues: getDefaultValues(),
    mode: "onChange", // Add this to ensure validation happens on change
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

  // Populate form with vehicle data when modal opens
  useEffect(() => {
    if (open) {
      const vehicleData = sessionStorage.getItem('vehicleFormData');
      const savedData = loadFormData(FORM_STORAGE_KEY);
      
      if (vehicleData) {
        const parsedData = JSON.parse(vehicleData);
        // Set all form values including address defaults
        form.reset({
          plateNo: parsedData.plateNo || '',
          fileNo: parsedData.fileNo || '',
          ownerRepresentativeName: parsedData.ownerRepresentativeName || '',
          purok: '',
          barangay: '',
          municipality: '',
          province: 'Davao Oriental',
          contactNumber: '',
          emailAddress: '',
          hasDriversLicense: false,
          driversLicenseNumber: '',
          birthDate: undefined,
        });
        // Clear saved data when using vehicle data
        clearFormData(FORM_STORAGE_KEY);
      } else if (savedData) {
        // Restore saved form data
        form.reset(savedData);
      } else {
        // Even without vehicle data, ensure form is properly initialized
        form.reset({
          plateNo: '',
          fileNo: '',
          ownerRepresentativeName: '',
          purok: '',
          barangay: '',
          municipality: '',
          province: 'Davao Oriental',
          contactNumber: '',
          emailAddress: '',
          hasDriversLicense: false,
          driversLicenseNumber: '',
          birthDate: undefined,
        });
      }
      
      // Ensure province is set after a small delay to allow HierarchicalLocationSelector to initialize
      setTimeout(() => {
        form.setValue('province', 'Davao Oriental');
        console.log('Province set to:', form.getValues('province'));
        // Trigger form validation to ensure all fields are properly validated
        form.trigger();
      }, 100);
    }
  }, [open, form]);

  const onSubmit = async (formData) => {
    // Get the current form values directly
    const currentFormValues = form.getValues();
    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Form values at submission:', currentFormValues);
    console.log('Specific address values:');
    console.log('  - barangay:', currentFormValues.barangay, '(type:', typeof currentFormValues.barangay, ')');
    console.log('  - municipality:', currentFormValues.municipality, '(type:', typeof currentFormValues.municipality, ')');
    console.log('  - province:', currentFormValues.province, '(type:', typeof currentFormValues.province, ')');
    console.log('  - purok:', currentFormValues.purok, '(type:', typeof currentFormValues.purok, ')');
    
    // Check if values are empty strings or undefined
    console.log('Value checks:');
    console.log('  - barangay empty?', !currentFormValues.barangay || currentFormValues.barangay.trim() === '');
    console.log('  - municipality empty?', !currentFormValues.municipality || currentFormValues.municipality.trim() === '');
    console.log('  - province empty?', !currentFormValues.province || currentFormValues.province.trim() === '');
    console.log('=== END DEBUG ===');
    
    // Manual validation for required fields
    const errors = [];
      
      // Validate plate number
      if (!currentFormValues.plateNo || (Array.isArray(currentFormValues.plateNo) && currentFormValues.plateNo.length === 0)) {
        errors.push("Plate number is required");
      }
      
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
      
      // Validate contact number format if provided
      if (currentFormValues.contactNumber && currentFormValues.contactNumber.trim() !== '') {
        const phone = currentFormValues.contactNumber.trim();
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(phone)) {
          errors.push("Contact number must start with 09 and contain 11 digits (numbers only)");
        }
      }
      
      // Validate email format if provided
      if (currentFormValues.emailAddress && currentFormValues.emailAddress.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(currentFormValues.emailAddress)) {
          errors.push("Invalid email format");
        }
      }
      
      // Validate birthDate - owner must be at least 18 years old
      if (currentFormValues.birthDate) {
        const today = new Date();
        const birthDate = new Date(currentFormValues.birthDate);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        
        // Calculate actual age considering month and day
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        
        if (actualAge < 18) {
          errors.push("Owner must be at least 18 years old");
        }
      }
      
      if (errors.length > 0) {
        console.log('Validation errors:', errors);
        toast.error("Please fill in all required fields", {
          description: errors.join(", ")
        });
        return;
      }
      
      // Show confirmation modal instead of submitting directly
      setConfirmationData(currentFormValues);
      setShowConfirmation(true);
      // Don't close the main dialog - keep it open behind the confirmation modal
      // The confirmation modal will handle closing when needed
  };

  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      const currentFormValues = confirmationData;
      
      const content = {
        plateNo: currentFormValues.plateNo,
        fileNo: currentFormValues.fileNo,
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

      console.log('=== SENDING TO SERVER ===');
      console.log('Content being sent:', content);
      console.log('Address object:', content.address);
      console.log('=== END SERVER DATA ===');

      const { data } = await apiClient.post("/owner", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Owner has been added", {
          description: date,
        });

        // Clear saved form data
        clearFormData(FORM_STORAGE_KEY);

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

        // Clear session storage
        sessionStorage.removeItem('vehicleFormData');
        
        // Close the Add Owner modal first, then call onDriverAdded
        // This prevents the cancel handler from being called
        onOpenChange(false);
        
        // Use setTimeout to ensure modal is closed before calling callback
        setTimeout(() => {
          // Call onDriverAdded callback with the new owner data
          // The parent will handle reopening the appropriate modal
          if (onDriverAdded) {
            onDriverAdded(data.data);
          }
        }, 100);
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to add owner";
      toast.error(message, {
        description: date,
      });
      // Reopen the Add Owner modal if there was an error
      if (!open) {
        onOpenChange(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // If closing and onCancel is provided, use it to return to Add Vehicle modal
      if (onCancel) {
        onCancel();
        return;
      }
      // Don't clear form data when closing - it will be restored next time
      // Only reset if user explicitly wants to discard (we'll keep the saved data)
    }
    onOpenChange(isOpen);
  };

  const handleCancel = () => {
    // Clear session storage
    sessionStorage.removeItem('vehicleFormData');
    
    // Call onCancel callback if provided (to return to Add Vehicle modal)
    if (onCancel) {
      onCancel();
    } else {
      // Fallback to default behavior
    handleOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar]:bg-transparent animate-in fade-in-0 zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Add New Owner
            </DialogTitle>
            <DialogDescription>
              Fill in the required fields to add a new owner record to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <FormComponent
              form={form}
              onSubmit={onSubmit}
              submitting={submitting}
              onCancel={handleCancel}
              lockVehicleFields={true}
            />
            
          </div>

          <DialogFooter className="flex justify-start gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
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
              {submitting ? "Adding..." : "Add Owner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={(isOpen) => {
        if (!isOpen) {
          // If confirmation is closed (e.g., clicking outside), just close confirmation
          // Don't call onCancel - keep the Add Owner modal open
          setShowConfirmation(false);
          // Reopen the Add Owner modal if it was closed
          if (!open) {
            onOpenChange(true);
          }
        }
      }}>
        <DialogContent className="max-w-lg border border-gray-200 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Confirm Owner Information
          </DialogTitle>
          <DialogDescription>
            Please review the owner information before submitting.
          </DialogDescription>
        </DialogHeader>

        {confirmationData && (
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-xs text-black mb-2 pl-3">Vehicle Information</h4>
              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium text-gray-600">Plate No:</div>
                  <div className="col-span-3">{Array.isArray(confirmationData.plateNo) ? confirmationData.plateNo.join(', ') : confirmationData.plateNo}</div>
                  
                  <div className="font-medium text-gray-600">File No:</div>
                  <div className="col-span-3">{confirmationData.fileNo || 'Not provided'}</div>
                  
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
            className="flex items-center gap-2 min-w-[120px] bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg border border-blue-600 relative overflow-hidden"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Adding..." : "Confirm & Add Owner"}
            {/* Page fold detail */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-blue-300 to-blue-500 transform rotate-45 translate-x-2 -translate-y-2 opacity-60"></div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AddDriverModal;
