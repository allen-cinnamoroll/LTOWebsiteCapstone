import React, { useState, useLayoutEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FormComponent from "@/components/vehicle/FormComponent";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { CreateDriverSchema, VehicleSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";

const AddVehicleForm = () => {
  const [submitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
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
      driver: "",
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        engineNo: formData.engineNo,
        serialChassisNumber: formData.chassisNo, // Map chassisNo to serialChassisNumber
        make: formData.make,
        bodyType: formData.bodyType,
        color: formData.color,
        classification: formData.classification,
        ownerId: formData.driver // Map driver to ownerId
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
    } catch (error) {
      const message = error.response.data.message;

      toast.error(message, {
        description: `${date}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">
          Add Vehicle
        </CardTitle>
        <CardDescription>
          Fill in required fields to add vehicle.
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
  );
};

export default AddVehicleForm;
