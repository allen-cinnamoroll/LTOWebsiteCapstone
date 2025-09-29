import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { driverLogs } from "../table/columns";
import TableComponent from "../table/TableComponent";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { createCategoryMap } from "@/util/helper";
import { formatSimpleDateTime } from "@/util/dateFormatter";
import { useParams } from "react-router-dom";

const logTypeMap = createCategoryMap({
  0: "Registration",
  1: "Violation",
  2: "Accident",
});

const DriverLogs = () => {
  const params = useParams();
  const [logData, setLogData] = useState([]);
  const auth = useAuth();
  const { token, userData } = auth || {};
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await apiClient.get(`/logs/${params.id}`, {
          headers: {
            Authorization: token,
          },
        });

        if (data.success) {
          const driverLogData = data.data.map((data) => ({
            id: data._id,
            fullname: data.driver.fullname,
            type: logTypeMap.get(data.type),
            message:data.message,
            timestamp: formatSimpleDateTime(data.createdAt),
          }));
          setLogData(driverLogData);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Card className="lg:col-span-3  border md:shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Driver Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <TableComponent tableColumn={driverLogs} data={logData} />
      </CardContent>
    </Card>
  );
};

export default DriverLogs;
