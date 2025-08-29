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
  const { token } = useAuth();
  const [violationData, setViolationData] = useState();
  const location = useLocation();
  const navigate = useNavigate();

  const fetchViolation = async () => {
    try {
      const { data } = await apiClient.get(`/violation/${params.id}`, {
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
          Violation #{violationData?.violation_id || "Details"}
        </CardTitle>
        <CardDescription>
          {violationData?.remarks || "No remarks available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-6">
        <div className="grid grid-cols-2 text-sm gap-4 mb-2">
          <h1 className="font-bold col-span-2 border-b px-6 py-1">Violation Information</h1>
          <h2 className="text-muted-foreground px-6">Date:</h2>
          <p className="font-semibold w-full">{formatSimpleDate(violationData?.violation_date)}</p>
          <h2 className="text-muted-foreground px-6">Type:</h2>
          <p className="font-semibold w-full">{violationData?.violation_type || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Penalty:</h2>
          <p className="font-semibold w-full">{violationData?.penalty || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Driver:</h2>
          <p className="font-semibold w-full">
            {violationData?.driver_id
              ? `${violationData.driver_id.firstName} ${violationData.driver_id.middleName || ""} ${violationData.driver_id.lastName}`
              : "N/A"}
          </p>
          <h2 className="text-muted-foreground px-6">License No:</h2>
          <p className="font-semibold w-full">
            {violationData?.driver_id?.licenseNo || "N/A"}
          </p>
          <h2 className="text-muted-foreground px-6">Vehicle:</h2>
          <p className="font-semibold w-full">{violationData?.vehicle_id ? `${violationData.vehicle_id.plateNo} (${violationData.vehicle_id.make} ${violationData.vehicle_id.series})` : "N/A"}</p>
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
