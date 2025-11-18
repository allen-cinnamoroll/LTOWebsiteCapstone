import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { vehicleBinColumns } from "@/components/table/columns";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const VehicleBinPage = () => {
  const [vehicleData, setVehicleData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [showRestoreAlert, setShowRestoreAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [vehicleToRestore, setVehicleToRestore] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  useEffect(() => {
    fetchDeletedVehicles();
  }, []);

  const fetchDeletedVehicles = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/vehicle/bin?page=1&limit=100", {
        headers: {
          Authorization: token,
        },
      });
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
          driverId: driverId,
          vehicleStatusType: dData.vehicleStatusType,
          deletedAt: dData.deletedAt,
          createdBy: dData.createdBy,
          createdAt: dData.createdAt,
          updatedBy: dData.updatedBy,
          updatedAt: dData.updatedAt,
        };
      });
      setVehicleData(vehicleData);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch deleted vehicles");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (vehicle) => {
    setVehicleToRestore(vehicle);
    setShowRestoreAlert(true);
  };

  const confirmRestore = async () => {
    if (!vehicleToRestore) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.patch(`/vehicle/bin/${vehicleToRestore._id}/restore`, {}, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Vehicle restored successfully");
      fetchDeletedVehicles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore vehicle");
    } finally {
      setIsSubmitting(false);
      setShowRestoreAlert(false);
      setVehicleToRestore(null);
    }
  };

  const cancelRestore = () => {
    setShowRestoreAlert(false);
    setVehicleToRestore(null);
  };

  const handlePermanentDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteAlert(true);
  };

  const confirmPermanentDelete = async () => {
    if (!vehicleToDelete) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.delete(`/vehicle/bin/${vehicleToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Vehicle permanently deleted successfully");
      fetchDeletedVehicles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to permanently delete vehicle");
    } finally {
      setIsSubmitting(false);
      setShowDeleteAlert(false);
      setVehicleToDelete(null);
    }
  };

  const cancelPermanentDelete = () => {
    setShowDeleteAlert(false);
    setVehicleToDelete(null);
  };

  const handleBack = () => {
    navigate("/vehicle");
  };

  // Disable row click - items in bin cannot be viewed/edited
  const onRowClick = () => {
    // Do nothing - items in bin cannot be viewed
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center gap-4 mb-3 md:mb-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <header className="text-xl md:text-2xl lg:text-3xl font-bold">Vehicles Bin</header>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <VehiclesTable
            data={vehicleData}
            filters={["plateNo", "fileNo", "engineNo", "chassisNo", "classification", "status"]}
            tableColumn={vehicleBinColumns}
            onAdd={null}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={null}
            onRenew={null}
            onDelete={null}
            onBinClick={null}
            submitting={submitting}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <ConfirmationDIalog
        open={showRestoreAlert}
        onOpenChange={setShowRestoreAlert}
        confirm={confirmRestore}
        cancel={cancelRestore}
        title="Restore this vehicle?"
        description="This action will restore the vehicle and make it available again in the main list."
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmPermanentDelete}
        cancel={cancelPermanentDelete}
        title="Permanently delete this vehicle?"
        description="This action cannot be undone. The vehicle will be permanently removed from the database."
      />
    </div>
  );
};

export default VehicleBinPage;

