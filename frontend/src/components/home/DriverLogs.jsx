import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { logs } from "@/components/table/columns";
import TableComponent from "@/components/table/TableComponent";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { createCategoryMap } from "@/util/helper";
import { formatSimpleDateTime } from "@/util/dateFormatter";

const logTypeMap = createCategoryMap({
    0: "Registration",
    1: "Violation",
    2:"Accident"
})

const DriverLogs = () => {
  const [logData, setLogData] = useState([]);
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await apiClient.get("/logs", {
          headers: {
            Authorization: token,
          },
        });

        if (data.success) {
          const driverLogData = data.data.map((data) => ({
            id: data._id,
            fullname: data.driver.fullname,
            type: logTypeMap.get(data.type),
            createdAt: formatSimpleDateTime(data.createdAt),
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
    <div className="w-full">
      <TableComponent tableColumn={logs} data={logData} />
    </div>
    
  );
};

export default DriverLogs;
