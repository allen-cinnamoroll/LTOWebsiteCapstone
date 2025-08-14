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
      firstName: "",
      middleName: "",
      lastName: "",
      street: "",
      barangay: "",
      municipality: "",
      province: "",
      fileNo: "",
      encumbrance: "",
      classification: undefined,
      vehicleType: "",
      make: "",
      fuelType: "",
      motorNumber: "",
      serialChassisNumber: "",
      bodyType: "",
      series: "",
      color: "",
      yearModel: "",
      dateRegistered: undefined,
      customVehicleType: "",
      customFuelType: "",
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        plateNo: formData.plateNo,
        owner: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          street: formData.street,
          barangay: formData.barangay,
          municipality: formData.municipality,
          province: formData.province,
        },
        fileNo: formData.fileNo,
        encumbrance: formData.encumbrance,
        vehicleType:
          formData.vehicleType !== "Other"
            ? formData.vehicleType
            : formData.customVehicleType,
        classification: formData.classification,
        make: formData.make,
        fuelType:
          formData.fuelType === "Other"
            ? formData.customFuelType
            : formData.fuelType,
        motorNumber: formData.motorNumber,
        serialChassisNumber: formData.serialChassisNumber,
        series: formData.series,
        bodyType: formData.bodyType,
        color: formData.color,
        yearModel: formData.yearModel,
        dateRegistered: formData.dateRegistered,
        expirationDate: formData.expirationDate
      };

      const { data } = await apiClient.post("/vehicle", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Vehicle has been added", {
          description: date,
        });

        form.reset();
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
