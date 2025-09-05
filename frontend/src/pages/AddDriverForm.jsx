import React, { useState, useLayoutEffect } from "react";
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
      ownerRepresentativeName: "",
      purok: "",
      barangay: "",
      municipality: "",
      province: "",
      region: "",
      contactNumber: "",
      emailAddress: "",
      hasDriversLicense: false,
      driversLicenseNumber: "",
      birthDate: undefined,
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        plateNo: formData.plateNo,
        ownerRepresentativeName: formData.ownerRepresentativeName,
        address: {
          purok: formData.purok,
          barangay: formData.barangay,
          municipality: formData.municipality,
          province: formData.province,
          region: formData.region,
        },
        contactNumber: formData.contactNumber,
        emailAddress: formData.emailAddress,
        hasDriversLicense: formData.hasDriversLicense,
        driversLicenseNumber: formData.driversLicenseNumber,
        birthDate: formData.birthDate,
      };

      const { data } = await apiClient.post("/driver", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Driver has been added", {
          description: date,
        });

        form.reset({
          plateNo: "",
          ownerRepresentativeName: "",
          purok: "",
          barangay: "",
          municipality: "",
          province: "",
          region: "",
          contactNumber: "",
          emailAddress: "",
          hasDriversLicense: false,
          driversLicenseNumber: "",
          birthDate: undefined,
        });
      }
    } catch (error) {
      console.log(error);
      const message = error.response.data.message;

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
            Add Driver
          </CardTitle>
          <CardDescription>
            Fill in required fields to add driver.
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
