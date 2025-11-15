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
  const [tableRenewalModalOpen, setTableRenewalModalOpen] = useState(false);
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editVehicleModalOpen, setEditVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [renewingVehicle, setRenewingVehicle] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      
      // Fetch all vehicles by using fetchAll parameter
      const { data } = await apiClient.get("/vehicle?fetchAll=true", {
        headers: {
          Authorization: token,
        },
      });

      if (!data.data || !Array.isArray(data.data)) {
        setVehicleData([]);
        return;
      }

      const vehicleData = data.data.map((dData) => {
        // Handle both populated and non-populated driverId
        const driverId = typeof dData.driverId === 'object' && dData.driverId?._id 
          ? dData.driverId._id 
          : dData.driverId;
        
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
          // Include metadata fields
          createdBy: dData.createdBy,
          createdAt: dData.createdAt,
          updatedBy: dData.updatedBy,
          updatedAt: dData.updatedAt,
        };
      });

      setVehicleData(vehicleData);
    } catch (error) {
      setVehicleData([]);
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
    setSelectedVehicle(data);
    setDetailsModalOpen(true);
  };

  const onEdit = (vehicleId) => {
    setEditingVehicleId(vehicleId);
    setEditVehicleModalOpen(true);
  };

  const onRenew = (vehicle) => {
    setRenewingVehicle(vehicle);
    setTableRenewalModalOpen(true);
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 flex-shrink-0">Vehicles</header>
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
            onRenew={onRenew}
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

      {/* Table Renewal Modal */}
      <VehicleRenewalModal 
        open={tableRenewalModalOpen} 
        onOpenChange={setTableRenewalModalOpen}
        vehicleData={renewingVehicle}
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