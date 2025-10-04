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
      fileNo: "",
      engineNo: "",
      chassisNo: "",
      make: "",
      bodyType: "",
      color: "",
      classification: undefined,
      // dateOfRenewal removed - can only be updated through renewal modal
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
        const vData = {
          plateNo: data.data?.plateNo,
          fileNo: data.data?.fileNo,
          engineNo: data.data?.engineNo, // Use engineNo directly from API
          chassisNo: data.data?.chassisNo, // Use chassisNo directly from API
          make: data.data?.make,
          bodyType: data.data?.bodyType,
          color: data.data?.color,
          classification: data.data?.classification,
          // dateOfRenewal removed - can only be updated through renewal modal
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
      const content = {
        plateNo: formData.plateNo,
        fileNo: formData.fileNo,
        engineNo: formData.engineNo, // Use engineNo directly
        serialChassisNumber: formData.chassisNo, // Map chassisNo to serialChassisNumber
        make: formData.make,
        bodyType: formData.bodyType,
        color: formData.color,
        classification: formData.classification,
        // dateOfRenewal removed - can only be updated through renewal modal
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
          hideDateOfRenewal={true}
        />
      </CardContent>
    </Card>
  );
};

export default EditVehicleForm;
