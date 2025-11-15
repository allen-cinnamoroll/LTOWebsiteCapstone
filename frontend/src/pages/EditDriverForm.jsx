import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FormComponent from "@/components/driver/FormComponent";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { CreateDriverSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";

const EditDriverForm = () => {
  const [submitting, setIsSubmitting] = useState(false);

  const { token } = useAuth();
  //   const [loading, setIsLoading] = useState(true);
  const params = useParams();
  const date = formatDate(Date.now());
  const [driverData, setDriverData] = useState({});
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(CreateDriverSchema),
    defaultValues: {
      plateNo: "",
      ownerRepresentativeName: "",
      purok: "",
      barangay: "",
      municipality: "",
      province: "Davao Oriental",
      contactNumber: "",
      emailAddress: "",
      hasDriversLicense: false,
      driversLicenseNumber: "",
      birthDate: undefined,
    },
  });
  const { reset } = form;

  // Update form when driverData changes
  useEffect(() => {
    if (Object.keys(driverData).length > 0) {
      reset(driverData);
    }
  }, [driverData, reset]);

  useEffect(() => {
    fetchData();
  }, [params.id, token]);

  const fetchData = async () => {
    const driverId = params.id;
    try {
      const { data } = await apiClient.get(`/owner/${driverId}`, {
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        const dData = {
          plateNo: data.data?.plateNo,
          ownerRepresentativeName: data.data?.ownerRepresentativeName,
          purok: data.data?.address?.purok,
          barangay: data.data?.address?.barangay,
          municipality: data.data?.address?.municipality,
          province: data.data?.address?.province || "Davao Oriental",
          contactNumber: data.data?.contactNumber,
          emailAddress: data.data?.emailAddress,
          hasDriversLicense: data.data?.hasDriversLicense,
          driversLicenseNumber: data.data?.driversLicenseNumber,
          birthDate: new Date(data.data?.birthDate),
        };

        setDriverData(dData);
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
        ownerRepresentativeName: formData.ownerRepresentativeName,
        address: {
          purok: formData.purok,
          barangay: formData.barangay,
          municipality: formData.municipality,
          province: formData.province,
        },
        contactNumber: formData.contactNumber,
        emailAddress: formData.emailAddress,
        hasDriversLicense: formData.hasDriversLicense,
        driversLicenseNumber: formData.driversLicenseNumber,
        birthDate: formData.birthDate,
      };

      const { data } = await apiClient.patch(`/owner/${params.id}`, content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Owner updated", {
          description: date,
        });
        navigate(-1);
      }
    } catch (error) {
      console.log(error);
      const message = error.response.data.message;

      toast.error(message, {
        description: `${date}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      {/* <section className="text-3xl font-bold">Add Driver</section> */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-3xl font-bold">
            Edit Owner
          </CardTitle>
          <CardDescription>
            Fill in required fields to edit owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default EditDriverForm;
