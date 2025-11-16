import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FormComponent from "@/components/driver/FormComponent";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { CreateDriverSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";

const AddDriverForm = () => {
  const [submitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();
  // const [loading, setIsLoading] = useState(true);
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

  // Pre-fill driver data if coming from vehicle form
  useEffect(() => {
    const driverSearchTerm = sessionStorage.getItem('driverSearchTerm');
    const vehicleFormData = sessionStorage.getItem('vehicleFormData');
    
    if (driverSearchTerm) {
      form.setValue('ownerRepresentativeName', driverSearchTerm);
    }
    
    if (vehicleFormData) {
      const vehicleData = JSON.parse(vehicleFormData);
      // Pre-fill plate number and file number from vehicle form
      if (vehicleData.plateNo) {
        form.setValue('plateNo', vehicleData.plateNo);
      }
      if (vehicleData.fileNo) {
        form.setValue('fileNo', vehicleData.fileNo);
      }
    }
  }, [form]);

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        ownerRepresentativeName: formData.ownerRepresentativeName,
        address: {
          purok: formData.purok,
          barangay: formData.barangay,
          municipality: formData.municipality,
          province: formData.province,
        },
        contactNumber: formData.contactNumber,
        emailAddress: formData.emailAddress,
        hasDriversLicense: formData.hasDriversLicense,
        driversLicenseNumber: formData.driversLicenseNumber,
        birthDate: formData.birthDate,
      };

      const { data } = await apiClient.post("/owner", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Owner has been added", {
          description: date,
        });

        // Check if we should automatically create vehicle
        const shouldReturnToVehicleForm = sessionStorage.getItem('returnToVehicleForm');
        if (shouldReturnToVehicleForm === 'true') {
          const vehicleFormData = sessionStorage.getItem('vehicleFormData');
          if (vehicleFormData) {
            try {
              // Automatically create the vehicle with the new driver
              const vehicleData = JSON.parse(vehicleFormData);
              
              // Check if all required vehicle fields are present
              const requiredFields = ['plateNo', 'fileNo', 'engineNo', 'chassisNo', 'make', 'bodyType', 'color', 'classification'];
              const missingFields = requiredFields.filter(field => !vehicleData[field] || vehicleData[field].trim() === '');
              
              if (missingFields.length > 0) {
                // If required fields are missing, don't try to create vehicle automatically
                toast.info("Owner created successfully. Please complete the vehicle registration.", {
                  description: "Some required vehicle information is missing.",
                });
                
                // Store the newly created driver ID for manual vehicle creation
                sessionStorage.setItem('newDriverId', data.data._id);
                sessionStorage.setItem('newDriverName', formData.ownerRepresentativeName);
                
                // Navigate back to vehicle form for manual creation
                navigate('/vehicle/create');
                return;
              }
              
              const vehicleContent = {
                ...vehicleData,
                driver: data.data._id // Use the newly created driver ID
              };
              
              const vehicleResponse = await apiClient.post("/vehicle", vehicleContent, {
                headers: {
                  Authorization: token,
                },
              });
              
              if (vehicleResponse.data.success) {
                toast.success("Owner and Vehicle added successfully", {
                  description: date,
                });
                
                // Clear session storage
                sessionStorage.removeItem('vehicleFormData');
                sessionStorage.removeItem('driverSearchTerm');
                sessionStorage.removeItem('returnToVehicleForm');
                
                // Navigate to vehicles page to show the new vehicle
                navigate('/vehicle');
                return;
              }
            } catch (vehicleError) {
              console.error("Error creating vehicle:", vehicleError);
              const errorMessage = vehicleError.response?.data?.message || "Unknown error occurred";
              toast.error("Owner created but failed to create vehicle. Please try again.", {
                description: `Error: ${errorMessage}`,
              });
              
              // Store the newly created driver ID for manual vehicle creation
              sessionStorage.setItem('newDriverId', data.data._id);
              sessionStorage.setItem('newDriverName', formData.ownerRepresentativeName);
              
              // Navigate back to vehicle form for manual creation
              navigate('/vehicle/create');
              return;
            }
          }
        }

        // If we're not returning to vehicle form, reset the form for another driver entry
        if (shouldReturnToVehicleForm !== 'true') {
          // Get the current plate and file numbers to preserve them
          const currentPlateNo = form.getValues('plateNo');
          const currentFileNo = form.getValues('fileNo');
          
          form.reset({
            plateNo: currentPlateNo || "",
            fileNo: currentFileNo || "",
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
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "An error occurred while creating the owner";

      toast.error(message, {
        description: `${date}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      {/* <section className="text-3xl font-bold">Add Driver</section> */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-3xl font-bold">
            Add Owner
          </CardTitle>
          <CardDescription>
            Fill in required fields to add owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default AddDriverForm;
