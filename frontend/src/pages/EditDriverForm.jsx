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
      licenseNo: "",
      firstName: "",
      middleName: "",
      lastName: "",
      street: "",
      barangay: "",
      municipality: "",
      province: "",
      nationality: "",
      sex: undefined,
      birthDate: undefined,
      civilStatus: "",
      birthPlace: "",
      issueDate: undefined,
      expiryDate: undefined,
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
      const { data } = await apiClient.get(`/driver/${driverId}`, {
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        const dData = {
          licenseNo: data.data?.licenseNo,
          firstName: data.data?.firstName,
          middleName: data.data?.middleName,
          lastName: data.data?.lastName,
          street: data.data?.address?.street,
          barangay: data.data?.address?.barangay,
          municipality: data.data?.address?.municipality,
          province: data.data?.address?.province,
          nationality: data.data?.nationality,
          sex: data.data?.sex,
          birthDate: new Date(data.data?.birthDate),
          civilStatus: data.data?.civilStatus,
          birthPlace: data.data?.birthPlace,
          issueDate: new Date(data.data?.issueDate),
          expiryDate: new Date(data.data?.expiryDate),
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
        licenseNo: formData.licenseNo,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        birthDate: formData.birthDate,
        sex: formData.sex,
        civilStatus: formData.civilStatus,
        address: {
          street: formData.street,
          barangay: formData.barangay,
          municipality: formData.municipality,
          province: formData.province,
        },
        nationality: formData.nationality,
        birthPlace: formData.birthPlace,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
      };

      const { data } = await apiClient.patch(`/driver/${params.id}`, content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Driver updated", {
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
            Edit Driver
          </CardTitle>
          <CardDescription>
            Fill in required fields to edit driver.
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
