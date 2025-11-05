
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
          Incident #{accidentData?.blotterNo || "Details"}
        </CardTitle>
        <CardDescription>
          {accidentData?.narrative || "No description available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-6">
        <div className="grid grid-cols-2 text-sm gap-4 mb-2">
          <h1 className="font-bold col-span-2 border-b px-6 py-1">Incident Information</h1>
          <h2 className="text-muted-foreground px-6">Date Committed:</h2>
          <p className="font-semibold w-full">{formatSimpleDate(accidentData?.dateCommited)}</p>
          <h2 className="text-muted-foreground px-6">Location:</h2>
          <p className="font-semibold w-full">{`${accidentData?.street || ""}, ${accidentData?.barangay || ""}, ${accidentData?.municipality || ""}`}</p>
          {accidentData?.vehiclePlateNo && (
            <>
              <h2 className="text-muted-foreground px-6">Vehicle Plate No:</h2>
              <p className="font-semibold w-full">{accidentData.vehiclePlateNo}</p>
            </>
          )}
          {accidentData?.vehicleMCPlateNo && (
            <>
              <h2 className="text-muted-foreground px-6">Vehicle MC Plate No:</h2>
              <p className="font-semibold w-full">{accidentData.vehicleMCPlateNo}</p>
            </>
          )}
          {accidentData?.vehicleChassisNo && (
            <>
              <h2 className="text-muted-foreground px-6">Vehicle Chassis No:</h2>
              <p className="font-semibold w-full">{accidentData.vehicleChassisNo}</p>
            </>
          )}
          <h2 className="text-muted-foreground px-6">Incident Type:</h2>
          <p className="font-semibold w-full">{accidentData?.incidentType || "N/A"}</p>
          <h2 className="text-muted-foreground px-6">Case Status:</h2>
          <p className="font-semibold w-full">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              accidentData?.caseStatus?.toLowerCase() === 'pending' ? 'text-yellow-600 bg-yellow-100' :
              accidentData?.caseStatus?.toLowerCase() === 'ongoing' ? 'text-blue-600 bg-blue-100' :
              accidentData?.caseStatus?.toLowerCase() === 'solved' ? 'text-green-600 bg-green-100' :
              accidentData?.caseStatus?.toLowerCase() === 'closed' ? 'text-gray-600 bg-gray-100' :
              'text-gray-600 bg-gray-100'
            }`}>
              {accidentData?.caseStatus || "N/A"}
            </span>
          </p>
          {accidentData?.suspect && (
            <>
              <h2 className="text-muted-foreground px-6">Suspect:</h2>
              <p className="font-semibold w-full">{accidentData.suspect}</p>
            </>
          )}
          {accidentData?.updatedAt && (
            <>
              <h2 className="text-muted-foreground px-6">Last Edited:</h2>
              <p className="font-semibold w-full">{formatSimpleDate(accidentData.updatedAt)}</p>
            </>
          )}
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
