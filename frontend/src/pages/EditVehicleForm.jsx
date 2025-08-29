import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FormComponent from "@/components/vehicle/FormComponent";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { VehicleSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";

const EditVehicleForm = () => {
  const [submitting, setIsSubmitting] = useState(false);

  const { token } = useAuth();
  //   const [loading, setIsLoading] = useState(true);
  const params = useParams();
  const date = formatDate(Date.now());
  const [vehicleData, setVehicleData] = useState({});
  const navigate = useNavigate();

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
  const { reset } = form;

  // Update form when vehicleData changes
  useEffect(() => {
    if (Object.keys(vehicleData).length > 0) {
      reset(vehicleData);
    }
  }, [vehicleData, reset]);

  useEffect(() => {
    fetchData();
  }, [params.id, token]);

  const fetchData = async () => {
    const vehicleId = params.id;
    try {
      const { data } = await apiClient.get(`/vehicle/${vehicleId}`, {
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        const ownerData = data.data?.owner;

        //handle vehicle type validations
        const validVehicleTypes = [
          "Car",
          "Motorcycle",
          "2nd Hand",
          "Rebuilt",
          "Truck",
        ];

        // If vehicle is NOT among the types above, set to Other
        const vehicleType = validVehicleTypes.includes(data.data?.vehicleType)
          ? data.data?.vehicleType
          : "Other";
        //handle valid fuel types
        const validFuelTypes = ["Gas", "Diesel", "LPG", "Electric"];

        // If fuel is NOT among the types above, set to Other
        const fuelType = validFuelTypes.includes(data.data?.fuelType)
          ? data.data?.fuelType
          : "Other";

        const vData = {
          firstName: ownerData.firstName,
          middleName: ownerData?.middleName,
          lastName: ownerData?.lastName,
          street: ownerData?.street,
          barangay: ownerData?.barangay,
          municipality: ownerData?.municipality,
          province: ownerData?.province,
          make: data.data?.make,
          series: data.data?.series,
          encumbrance: data.data?.encumbrance,
          fileNo: data.data?.fileNo,
          classification: data.data?.classification,
          vehicleType: vehicleType,
          customVehicleType:
            vehicleType === "Other" ? data.data?.vehicleType || "" : "",
          plateNo: data.data?.plateNo,
          bodyType: data.data?.bodyType,
          color: data.data?.color,
          yearModel: data.data?.yearModel ? data.data.yearModel.toString() : "",
          fuelType: fuelType,
          customFuelType: fuelType === "Other" ? data.data?.fuelType || "" : "",
          motorNumber: data.data?.motorNumber,
          serialChassisNumber: data.data?.serialChassisNumber,
          dateRegistered: new Date(data.data?.dateRegistered),
          expirationDate: new Date(data.data?.expirationDate),
        };

        setVehicleData(vData);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const normalizeField = (field, customField) =>
        field === "Other" ? customField : field;

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
        vehicleType: normalizeField(
          formData.vehicleType,
          formData.customVehicleType
        ),
        classification: formData.classification,
        make: formData.make,
        fuelType: normalizeField(formData.fuelType, formData.customFuelType),
        motorNumber: formData.motorNumber,
        serialChassisNumber: formData.serialChassisNumber,
        series: formData.series,
        bodyType: formData.bodyType,
        color: formData.color,
        yearModel: formData.yearModel,
        dateRegistered: formData.dateRegistered,
        expirationDate: formData.expirationDate,
      };


      const { data } = await apiClient.patch(`/vehicle/${params.id}`, content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Vehicle updated", {
          description: date,
        });
        
        navigate(-1);
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "An error occurred";

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
          Edit Vehicle
        </CardTitle>
        <CardDescription>
          Fill in required fields to edit vehicle.
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

export default EditVehicleForm;
