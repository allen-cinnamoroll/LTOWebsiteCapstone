import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit } from "lucide-react";

const ViolationCard = () => {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const { token } = auth || {};
  const [violationData, setViolationData] = useState();
  const location = useLocation();
  const navigate = useNavigate();

  const fetchViolation = async () => {
    try {
      const { data } = await apiClient.get(`/violations/${params.id}`, {
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        setViolationData(data.data);
      }
    } catch (error) {
      // handle error, e.g. navigate to 404
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchViolation();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card className="lg:col-span-2 row-span-2 border md:shadow-none">
      <CardHeader className="border-b">
        <CardTitle className="text-3xl font-bold">
          TOP #{violationData?.topNo || "Details"}
        </CardTitle>
        <CardDescription>
          {violationData?.remarks || "No remarks available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-6">
        <div className="grid grid-cols-2 text-sm gap-4 mb-2">
          <h1 className="font-bold col-span-2 border-b px-6 py-1">Apprehension Details</h1>
          <h2 className="text-muted-foreground px-6">Name:</h2>
          <p className="font-semibold w-full">
            {violationData?.firstName && violationData?.lastName
              ? `${violationData.firstName}${violationData.middleInitial ? ` ${violationData.middleInitial}.` : ''} ${violationData.lastName}${violationData.suffix ? ` ${violationData.suffix}` : ''}`
              : "N/A"}
          </p>
          <h2 className="text-muted-foreground px-6">Violations:</h2>
          <p className="font-semibold w-full">
            {violationData?.violations && Array.isArray(violationData.violations)
              ? violationData.violations.join(", ")
              : "N/A"}
          </p>
          
          <h1 className="font-bold col-span-2 border-b px-6 py-1 mt-4">Confiscated Item</h1>
          <h2 className="text-muted-foreground px-6">License Type:</h2>
          <p className="font-semibold w-full">{violationData?.licenseType || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Plate No:</h2>
          <p className="font-semibold w-full">{violationData?.plateNo || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Date of Apprehension:</h2>
          <p className="font-semibold w-full">{formatSimpleDate(violationData?.dateOfApprehension)}</p>
          <h2 className="text-muted-foreground px-6">Apprehending Officer:</h2>
          <p className="font-semibold w-full">{violationData?.apprehendingOfficer || "N/A"}</p>
        </div>
      </CardContent>
      <CardFooter className="gap-2 text-sm ">
        <Button
          onClick={() => navigate(`${location.pathname}/edit`)}
          size="sm"
          className="font-semibold"
          variant="outline"
        >
          <Edit />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ViolationCard;
