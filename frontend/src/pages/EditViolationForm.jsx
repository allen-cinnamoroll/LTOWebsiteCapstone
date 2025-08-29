import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { ViolationCreateSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import FormComponent from "@/components/violations/FormComponent";

const EditViolationForm = () => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const params = useParams();
  const date = formatDate(Date.now());
  const navigate = useNavigate();

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
  const { reset } = form;

  useEffect(() => {
    fetchData();
  }, [params.id, token]);

  const fetchData = async () => {
    const violationId = params.id;
    try {
      const { data } = await apiClient.get(`/violation/${violationId}`, {
        headers: { Authorization: token },
      });
      if (data?.data) {
        const v = data.data;
        reset({
          violation_id: v.violation_id,
          driver_id: v.driver_id?.licenseNo || "",
          vehicle_id: v.vehicle_id?.plateNo || "",
          violation_type: v.violation_type,
          violation_date: new Date(v.violation_date),
          penalty: v.penalty,
          remarks: v.remarks || "",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

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

      const { data } = await apiClient.patch(`/violation/${params.id}`, content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Violation updated", { description: date });
        navigate(-1);
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update violation";
      toast.error(message, { description: `${date}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">Edit Violation</CardTitle>
        <CardDescription>Update violation details.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormComponent form={form} onSubmit={onSubmit} submitting={submitting} />
      </CardContent>
    </Card>
  );
};

export default EditViolationForm;
