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

const AddDriverModal = ({ open, onOpenChange, onDriverAdded }) => {
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
        // Save with current connection status
        const isOffline = !navigator.onLine;
        saveFormData(FORM_STORAGE_KEY, formValues, isOffline);
      } else {
        // Clear saved data if form is empty (only if online)
        clearFormData(FORM_STORAGE_KEY, false);
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
        // Clear saved data when using vehicle data (force clear)
        clearFormData(FORM_STORAGE_KEY, true);
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
      
      // Validate email format if provided
      if (currentFormValues.emailAddress && currentFormValues.emailAddress.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(currentFormValues.emailAddress)) {
          errors.push("Invalid email format");
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
      // Close the main dialog to prevent nested modals
      onOpenChange(false);
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

        // Clear saved form data (force clear on successful submission)
        clearFormData(FORM_STORAGE_KEY, true);

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

        // Clear session storage and close modal
        sessionStorage.removeItem('vehicleFormData');
        onOpenChange(false);
        if (onDriverAdded) {
          onDriverAdded(data.data);
        }
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to add owner";
      toast.error(message, {
        description: date,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // Only clear saved form data if internet is connected
      // If internet was disconnected, preserve the data
      clearFormData(FORM_STORAGE_KEY, false);
      
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
    // Clear session storage and close modal
    sessionStorage.removeItem('vehicleFormData');
    handleOpenChange(false);
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
        setShowConfirmation(isOpen);
        if (!isOpen) {
          // If confirmation is closed, also close the main dialog
          onOpenChange(false);
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
