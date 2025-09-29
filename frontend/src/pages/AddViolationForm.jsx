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

      console.log("Content being sent to API:", content);
      const { data } = await apiClient.post("/violations", content, {
        headers: { Authorization: token },
      });
      console.log("API Response:", data);

      if (data.success) {
        toast.success("Violation has been added", { description: date });
        form.reset();
        navigate("/violation");
      }
    } catch (error) {
      console.log("=== API ERROR ===");
      console.log("Error object:", error);
      console.log("Error response:", error?.response);
      console.log("Error data:", error?.response?.data);
      console.log("Error status:", error?.response?.status);
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
