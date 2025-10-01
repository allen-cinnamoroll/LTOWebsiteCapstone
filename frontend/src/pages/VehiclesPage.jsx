import apiClient from "@/api/axios";
import { vehicleColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import VehicleRenewalModal from "@/components/vehicle/VehicleRenewalModal";
import AddVehicleModal from "@/components/vehicle/AddVehicleModal";


const VehiclesPage = () => {
  const [vehicleData, setVehicleData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const date = formatDate(Date.now());
  const [submitting, setIsSubmitting] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);

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
  //open add vehicle modal
  const handleAdd = async () => {
    setAddVehicleModalOpen(true);
  };

  //navigate to vehicle page
  const onRowClick = (data) => {
    const vehicleId = data._id;

    navigate(`/vehicle/${vehicleId}`);
  };

  const onEdit = (vehicleId) => {
    navigate(`/vehicle/${vehicleId}/edit`);
  };

  const handleRenewal = () => {
    setRenewalModalOpen(true);
  };

  const handleVehicleUpdated = () => {
    // Refresh the vehicle list when a vehicle is updated through renewal modal
    fetchVehicles();
  };

  const handleVehicleAdded = () => {
    // Refresh the vehicle list when a new vehicle is added
    fetchVehicles();
  };



  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex-1 flex flex-col min-h-0">
        <header className="text-xl md:text-3xl font-bold mb-4 flex-shrink-0">Vehicles</header>
        <div className="flex-1 flex flex-col min-h-0">
          {/* Call vehicle table component */}
          <VehiclesTable
            data={vehicleData}
            filters={["plateNo", "fileNo", "engineNo", "chassisNo", "classification", "status"]}
            tableColumn={vehicleColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onRenewal={handleRenewal}
            submitting={submitting}
          />
        </div>
      </div>

      {/* Renewal Modal */}
      <VehicleRenewalModal 
        open={renewalModalOpen} 
        onOpenChange={setRenewalModalOpen}
        onVehicleUpdated={handleVehicleUpdated}
      />

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        open={addVehicleModalOpen}
        onOpenChange={setAddVehicleModalOpen}
        onVehicleAdded={handleVehicleAdded}
      />
    </div>
  );
};

export default VehiclesPage;
