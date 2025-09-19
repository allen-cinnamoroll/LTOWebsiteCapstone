
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
          <h2 className="text-muted-foreground px-6">Plate No:</h2>
          <p className="font-semibold w-full">{accidentData?.plateNo || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Vehicle Type:</h2>
          <p className="font-semibold w-full">{accidentData?.vehicle_type || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Severity:</h2>
          <p className="font-semibold w-full">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              accidentData?.severity === 'minor' ? 'text-green-600 bg-green-100' :
              accidentData?.severity === 'moderate' ? 'text-yellow-600 bg-yellow-100' :
              accidentData?.severity === 'severe' ? 'text-orange-600 bg-orange-100' :
              accidentData?.severity === 'fatal' ? 'text-red-600 bg-red-100' :
              'text-gray-600 bg-gray-100'
            }`}>
              {accidentData?.severity || "N/A"}
            </span>
          </p>
          {accidentData?.notes && (
            <>
              <h2 className="text-muted-foreground px-6">Notes:</h2>
              <p className="font-semibold w-full col-span-2">{accidentData.notes}</p>
            </>
          )}
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
