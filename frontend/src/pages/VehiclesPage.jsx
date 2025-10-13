import apiClient from "@/api/axios";
import { vehicleColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import VehicleRenewalModal from "@/components/vehicle/VehicleRenewalModal";
import AddVehicleModal from "@/components/vehicle/AddVehicleModal";
import VehicleDetailsModal from "@/components/vehicle/VehicleDetailsModal";
import EditVehicleModal from "@/components/vehicle/EditVehicleModal";


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
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editVehicleModalOpen, setEditVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

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
        console.log('Processing vehicle data:', dData.plateNo, 'DriverId:', dData.driverId);
        console.log('DriverId type:', typeof dData.driverId);
        console.log('DriverId is object:', typeof dData.driverId === 'object');
        
        // Handle both populated and non-populated driverId
        const driverId = typeof dData.driverId === 'object' && dData.driverId?._id 
          ? dData.driverId._id 
          : dData.driverId;
          
        console.log('Final driverId:', driverId);
        
        return {
          _id: dData._id,
          plateNo: dData.plateNo,
          fileNo: dData.fileNo,
          engineNo: dData.engineNo,
          chassisNo: dData.serialChassisNumber,
          make: dData.make,
          bodyType: dData.bodyType,
          color: dData.color,
          classification: dData.classification,
          dateOfRenewal: dData.dateOfRenewal,
          status: dData.status,
          driverId: driverId, // Use the extracted driverId
          vehicleStatusType: dData.vehicleStatusType, // Include vehicleStatusType
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

  //open vehicle details modal
  const onRowClick = (data) => {
    console.log('=== VEHICLE ROW CLICKED ===');
    console.log('Vehicle data:', data);
    console.log('DriverId:', data?.driverId);
    setSelectedVehicle(data);
    setDetailsModalOpen(true);
  };

  const onEdit = (vehicleId) => {
    setEditingVehicleId(vehicleId);
    setEditVehicleModalOpen(true);
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

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        vehicleData={selectedVehicle}
      />

      {/* Edit Vehicle Modal */}
      <EditVehicleModal
        open={editVehicleModalOpen}
        onOpenChange={setEditVehicleModalOpen}
        vehicleId={editingVehicleId}
        onVehicleUpdated={handleVehicleUpdated}
      />
    </div>
  );
};

export default VehiclesPage;