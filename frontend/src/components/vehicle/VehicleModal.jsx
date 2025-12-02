import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { Car } from "lucide-react";
import { toast } from "sonner";
import VehicleDetailsModal from "./VehicleDetailsModal";

// Thin wrapper used when we only have a file number.
// It fetches the vehicle by file number, then reuses the full VehicleDetailsModal
// so the UI matches the richer design used on the Vehicles page.
const VehicleModal = ({ open, onOpenChange, fileNumber }) => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (open && fileNumber) {
      fetchVehicleData();
    }
  }, [open, fileNumber]);

  const fetchVehicleData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/vehicle/file/${fileNumber}`, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        setVehicleData(data.data);
      } else {
        toast.error("Failed to fetch vehicle information");
      }
    } catch (error) {
      console.error("Error fetching vehicle data:", error);
      toast.error("Failed to fetch vehicle information");
    } finally {
      setLoading(false);
    }
  };

  // While loading and we don't yet have data, show a lightweight shell.
  if (loading && !vehicleData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Information
            </DialogTitle>
            <DialogDescription>
              Loading vehicle details for file number: {fileNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Once we have data (or even if data is null), delegate to VehicleDetailsModal
  return (
    <VehicleDetailsModal
      open={open}
      onOpenChange={onOpenChange}
      vehicleData={vehicleData}
      onVehicleUpdated={setVehicleData}
      onEditClick={undefined}
    />
  );
};

export default VehicleModal;
