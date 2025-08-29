import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { ViolationCreateSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import FormComponent from "@/components/violations/FormComponent";

const AddViolationForm = () => {
  const [submitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const form = useForm({
    resolver: zodResolver(ViolationCreateSchema),
    defaultValues: {
      violation_id: "",
      driver_id: "",
      vehicle_id: "",
      violation_type: "",
      violation_date: undefined,
      penalty: 0,
      remarks: "",
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        violation_id: formData.violation_id,
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id,
        violation_type: formData.violation_type,
        violation_date: formData.violation_date,
        penalty: formData.penalty,
        remarks: formData.remarks,
      };

      const { data } = await apiClient.post("/violation", content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Violation has been added", { description: date });
        form.reset();
        navigate("/violation");
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to add violation";
      toast.error(message, { description: `${date}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">Add Violation</CardTitle>
        <CardDescription>Fill in required fields to add violation.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormComponent form={form} onSubmit={onSubmit} submitting={submitting} />
      </CardContent>
    </Card>
  );
};

export default AddViolationForm;
