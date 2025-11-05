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
      blotterNo: "",
      vehiclePlateNo: "",
      vehicleMCPlateNo: "",
      vehicleChassisNo: "",
      suspect: "",
      stageOfFelony: "",
      offense: "",
      offenseType: "",
      narrative: "",
      caseStatus: "",
      region: "",
      province: "",
      municipality: "",
      barangay: "",
      street: "",
      lat: undefined,
      lng: undefined,
      dateEncoded: undefined,
      dateReported: undefined,
      timeReported: "",
      dateCommited: undefined,
      timeCommited: "",
      incidentType: "",
    },
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const content = {
        blotterNo: formData.blotterNo,
        vehiclePlateNo: formData.vehiclePlateNo,
        vehicleMCPlateNo: formData.vehicleMCPlateNo,
        vehicleChassisNo: formData.vehicleChassisNo,
        suspect: formData.suspect,
        stageOfFelony: formData.stageOfFelony,
        offense: formData.offense,
        offenseType: formData.offenseType,
        narrative: formData.narrative,
        caseStatus: formData.caseStatus,
        region: formData.region,
        province: formData.province,
        municipality: formData.municipality,
        barangay: formData.barangay,
        street: formData.street,
        lat: formData.lat,
        lng: formData.lng,
        dateEncoded: formData.dateEncoded ? formData.dateEncoded.toISOString() : null,
        dateReported: formData.dateReported ? formData.dateReported.toISOString() : null,
        timeReported: formData.timeReported,
        dateCommited: formData.dateCommited ? formData.dateCommited.toISOString() : null,
        timeCommited: formData.timeCommited,
        incidentType: formData.incidentType,
      };

      console.log("Sending incident data:", content);

      const { data } = await apiClient.post("/accident", content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Incident has been added", { description: date });
        form.reset();
        navigate("/accident");
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to add incident";
      toast.error(message, { description: `${date}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">Add Incident</CardTitle>
        <CardDescription>Fill in required fields to add incident record.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormComponent form={form} onSubmit={onSubmit} submitting={submitting} />
      </CardContent>
    </Card>
  );
};

export default AddAccidentForm;
