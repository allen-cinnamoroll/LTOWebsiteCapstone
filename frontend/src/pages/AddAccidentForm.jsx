import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { AccidentSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import FormComponent from "@/components/accidents/FormComponent";

const AddAccidentForm = () => {
  const [submitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(AccidentSchema),
    defaultValues: {
      accident_id: "",
      driver_id: "",
      vehicle_id: "",
      accident_date: undefined,
      street: "",
      barangay: "",
      municipality: "",
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        accident_id: formData.accident_id,
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id,
        accident_date: formData.accident_date,
        street: formData.street,
        barangay: formData.barangay,
        municipality: formData.municipality,
      };

      const { data } = await apiClient.post("/accident", content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Accident has been added", { description: date });
        form.reset();
        navigate("/accident");
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to add accident";
      toast.error(message, { description: `${date}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">Add Accident</CardTitle>
        <CardDescription>Fill in required fields to add accident.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormComponent form={form} onSubmit={onSubmit} submitting={submitting} />
      </CardContent>
    </Card>
  );
};

export default AddAccidentForm;
