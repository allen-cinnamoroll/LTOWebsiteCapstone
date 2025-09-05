import apiClient from "@/api/axios";
import { vehicleColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VehiclesTable from "@/components/vehicles/VehiclesTable";


const VehiclesPage = () => {
  const [vehicleData, setVehicleData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const date = formatDate(Date.now());
  const [submitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data } = await apiClient.get("/vehicle", {
        headers: {
          Authorization: token,
        },
      });

      const vehicleData = data.data.map((dData) => {
        return {
          _id: dData._id,
          plateNo: dData.plateNo,
          fileNo: dData.fileNo,
          engineNo: dData.engineNo,
          chassisNo: dData.chassisNo,
          make: dData.make,
          bodyType: dData.bodyType,
          color: dData.color,
          classification: dData.classification,
          dateOfRenewal: dData.dateOfRenewal,
          status: dData.status,
        };
      });

      setVehicleData(vehicleData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  //navigate to add vehicle page
  const handleAdd = async () => {
    navigate(`${location.pathname}/create`);
  };

  //navigate to vehicle page
  const onRowClick = (data) => {
    const vehicleId = data._id;

    navigate(`/vehicle/${vehicleId}`);
  };

  const onEdit = (vehicleId) => {
    navigate(`/vehicle/${vehicleId}/edit`);
  };



  return (
    <div className="p-4">
      <header className="text-xl md:text-3xl font-bold mb-5">Vehicles</header>
      <section>
        {/* Call vehicle table component */}
        <VehiclesTable
          data={vehicleData}
          filters={["plateNo", "fileNo", "engineNo", "chassisNo", "make", "bodyType", "color", "classification", "status"]}
          tableColumn={vehicleColumns}
          onAdd={handleAdd}
          loading={loading}
          onRowClick={onRowClick}
          onEdit={onEdit}
          submitting={submitting}
        />
      </section>
    </div>
  );
};

export default VehiclesPage;
