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
          blotterNo: a.blotterNo || "",
          vehiclePlateNo: a.vehiclePlateNo || "",
          vehicleMCPlateNo: a.vehicleMCPlateNo || "",
          vehicleChassisNo: a.vehicleChassisNo || "",
          suspect: a.suspect || "",
          stageOfFelony: a.stageOfFelony || "",
          offense: a.offense || "",
          offenseType: a.offenseType || "",
          narrative: a.narrative || "",
          caseStatus: a.caseStatus || "",
          region: a.region || "",
          province: a.province || "",
          municipality: a.municipality || "",
          barangay: a.barangay || "",
          street: a.street || "",
          lat: a.lat || undefined,
          lng: a.lng || undefined,
          dateEncoded: a.dateEncoded ? new Date(a.dateEncoded) : undefined,
          dateReported: a.dateReported ? new Date(a.dateReported) : undefined,
          timeReported: a.timeReported || "",
          dateCommited: a.dateCommited ? new Date(a.dateCommited) : undefined,
          timeCommited: a.timeCommited || "",
          incidentType: a.incidentType || "",
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

      const { data } = await apiClient.patch(`/accident/${params.id}`, content, {
        headers: { Authorization: token },
      });

      if (data.success) {
        toast.success("Incident updated", { description: date });
        navigate(-1);
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update incident";
      toast.error(message, { description: `${date}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl md:text-3xl font-bold">Edit Incident</CardTitle>
        <CardDescription>Update incident details.</CardDescription>
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
