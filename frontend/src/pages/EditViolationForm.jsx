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
      topNo: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      violations: [],
      violationType: "confiscated",
      licenseType: undefined,
      plateNo: "",
      dateOfApprehension: undefined,
      apprehendingOfficer: "",
      chassisNo: "",
      engineNo: "",
    },
  });
  const { reset } = form;

  useEffect(() => {
    fetchData();
  }, [params.id, token]);

  const fetchData = async () => {
    const violationId = params.id;
    try {
      const { data } = await apiClient.get(`/violations/${violationId}`, {
        headers: { Authorization: token },
      });
      if (data?.data) {
        const v = data.data;
        
        // Use violationType directly (now using string enum values)
        const violationType = v.violationType || "confiscated";
        
        reset({
          topNo: v.topNo || "",
          firstName: v.firstName || "",
          middleInitial: v.middleInitial || "",
          lastName: v.lastName || "",
          suffix: v.suffix || "",
          violations: v.violations || [""],
          violationType: violationType,
          licenseType: v.licenseType || undefined,
          plateNo: v.plateNo || "",
          dateOfApprehension: v.dateOfApprehension ? new Date(v.dateOfApprehension) : undefined,
          apprehendingOfficer: v.apprehendingOfficer || "",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // Prepare content based on violation type
      const content = {
        topNo: formData.topNo,
        violationType: formData.violationType,
        plateNo: formData.plateNo,
        dateOfApprehension: formData.dateOfApprehension,
        apprehendingOfficer: formData.apprehendingOfficer,
      };

      // Add fields based on violation type
      if (formData.violationType === "confiscated") {
        content.firstName = formData.firstName;
        content.middleInitial = formData.middleInitial;
        content.lastName = formData.lastName;
        content.suffix = formData.suffix;
        content.violations = formData.violations ? formData.violations.filter(v => v.trim() !== "") : [];
        content.licenseType = formData.licenseType;
      } else if (formData.violationType === "impounded") {
        content.firstName = formData.firstName;
        content.middleInitial = formData.middleInitial;
        content.lastName = formData.lastName;
        content.suffix = formData.suffix;
        content.violations = formData.violations ? formData.violations.filter(v => v.trim() !== "") : [];
        content.licenseType = null;
      } else if (formData.violationType === "alarm") {
        // For alarm type, set all fields to null
        content.firstName = null;
        content.middleInitial = null;
        content.lastName = null;
        content.suffix = null;
        content.violations = null;
        content.licenseType = null;
      }

      const { data } = await apiClient.patch(`/violations/${params.id}`, content, {
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
