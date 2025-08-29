
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

const AccidentCard = () => {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const [accidentData, setAccidentData] = useState();
  const location = useLocation();
  const navigate = useNavigate();

  const fetchAccident = async () => {
    try {
      const { data } = await apiClient.get(`/accident/${params.id}`, {
        headers: {
          Authorization: token,
        },
      });
      if (data) {
        setAccidentData(data.data);
      }
    } catch (error) {
      // handle error, e.g. navigate to 404
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccident();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Card className="lg:col-span-2 row-span-2 border md:shadow-none">
      <CardHeader className="border-b">
        <CardTitle className="text-3xl font-bold">
          Accident #{accidentData?.accident_id || "Details"}
        </CardTitle>
        <CardDescription>
          {accidentData?.description || "No description available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-6">
        <div className="grid grid-cols-2 text-sm gap-4 mb-2">
          <h1 className="font-bold col-span-2 border-b px-6 py-1">Accident Information</h1>
          <h2 className="text-muted-foreground px-6">Date:</h2>
          <p className="font-semibold w-full">{formatSimpleDate(accidentData?.accident_date)}</p>
          <h2 className="text-muted-foreground px-6">Location:</h2>
          <p className="font-semibold w-full">{`${accidentData?.street || ""}, ${accidentData?.barangay || ""}, ${accidentData?.municipality || ""}`}</p>
          <h2 className="text-muted-foreground px-6">Driver:</h2>
          <p className="font-semibold w-full">
            {accidentData?.driver_id
              ? `${accidentData.driver_id.firstName} ${accidentData.driver_id.middleName || ""} ${accidentData.driver_id.lastName}`
              : "N/A"}
          </p>
          <h2 className="text-muted-foreground px-6">License No:</h2>
          <p className="font-semibold w-full">
            {accidentData?.driver_id?.licenseNo || "N/A"}
          </p>
          <h2 className="text-muted-foreground px-6">Vehicle:</h2>
          <p className="font-semibold w-full">{accidentData?.vehicle_id ? `${accidentData.vehicle_id.plateNo} (${accidentData.vehicle_id.make} ${accidentData.vehicle_id.series})` : "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Last Edited:</h2>
          <p className="font-semibold w-full">{formatSimpleDate(accidentData?.time_edited)}</p>
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

export default AccidentCard;
