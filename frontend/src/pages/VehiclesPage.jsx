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
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";


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
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  /**
   * fetchVehicles - Optimized vehicle fetching with pagination
   * 
   * IMPROVEMENTS:
   * - Uses server-side pagination with limit (100 items) instead of fetchAll
   * - Reduces initial payload size significantly
   * - For very large datasets (>1000 vehicles), consider implementing full server-side pagination
   *   in VehiclesTable component (currently uses client-side pagination)
   */
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      
      // Use pagination with reasonable limit instead of fetching all
      // This reduces payload size and improves initial load time
      const { data } = await apiClient.get("/vehicle?page=1&limit=100", {
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

  const handleDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    
    try {
      await apiClient.delete(`/vehicle/${vehicleToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Vehicle moved to bin successfully");
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete vehicle");
    } finally {
      setShowDeleteAlert(false);
      setVehicleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
    setVehicleToDelete(null);
  };

  const handleBinClick = () => {
    navigate("/vehicle/bin");
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
            onDelete={handleDelete}
            onBinClick={handleBinClick}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmDelete}
        cancel={cancelDelete}
        title="Do you want to delete this?"
        description="This action will move the vehicle to bin. You can restore it later from the bin."
      />
    </div>
  );
};

export default VehiclesPage;