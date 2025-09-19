import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { AccidentSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import FormComponent from "@/components/accidents/FormComponent";

const EditAccidentForm = () => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const params = useParams();
  const date = formatDate(Date.now());
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(AccidentSchema),
    defaultValues: {
      accident_id: "",
      plateNo: "",
      accident_date: undefined,
      street: "",
      barangay: "",
      municipality: "",
      vehicle_type: "",
      severity: "",
      notes: "",
    },
  });
  const { reset } = form;

  useEffect(() => {
    fetchData();
  }, [params.id, token]);

  const fetchData = async () => {
    const accidentId = params.id;
    try {
      const { data } = await apiClient.get(`/accident/${accidentId}`, {
        headers: { Authorization: token },
      });
      if (data?.data) {
        const a = data.data;
        reset({
          accident_id: a.accident_id,
          plateNo: a.plateNo || "",
          accident_date: new Date(a.accident_date),
          street: a.street,
          barangay: a.barangay,
          municipality: a.municipality,
          vehicle_type: a.vehicle_type || "",
          severity: a.severity || "",
          notes: a.notes || "",
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
        accident_id: formData.accident_id,
        plateNo: formData.plateNo,
        accident_date: formData.accident_date ? formData.accident_date.toISOString() : null,
        street: formData.street,
        barangay: formData.barangay,
        municipality: formData.municipality,
        vehicle_type: formData.vehicle_type,
        severity: formData.severity,
        notes: formData.notes,
      };

      const { data } = await apiClient.patch(`/accident/${params.id}`, content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Accident updated", { description: date });
        navigate(-1);
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update accident";
      toast.error(message, { description: `${date}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">Edit Accident</CardTitle>
        <CardDescription>Update accident details.</CardDescription>
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

export default EditAccidentForm;
