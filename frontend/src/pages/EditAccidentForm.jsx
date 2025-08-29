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
      driver_id: "",
      vehicle_id: "",
      accident_date: undefined,
      street: "",
      barangay: "",
      municipality: "",
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
          driver_id: a.driver_id?.licenseNo || "",
          vehicle_id: a.vehicle_id?.plateNo || "",
          accident_date: new Date(a.accident_date),
          street: a.street,
          barangay: a.barangay,
          municipality: a.municipality,
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
        driver_id: formData.driver_id,
        vehicle_id: formData.vehicle_id,
        accident_date: formData.accident_date,
        street: formData.street,
        barangay: formData.barangay,
        municipality: formData.municipality,
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
