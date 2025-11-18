import apiClient from "@/api/axios";
import { driverBinColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DriversTable from "@/components/drivers/DriversTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const OwnerBinPage = () => {
  const [driverData, setDriverData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [showRestoreAlert, setShowRestoreAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [driverToRestore, setDriverToRestore] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);

  useEffect(() => {
    fetchDeletedDrivers();
  }, []);

  const fetchDeletedDrivers = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/owner/bin?page=1&limit=100", {
        headers: {
          Authorization: token,
        },
      });

      if (!data.data || !Array.isArray(data.data)) {
        setDriverData([]);
        return;
      }

      const driverData = data.data.map((dData) => {
        const plateNumbers = dData.vehicleIds?.map(vehicle => vehicle.plateNo).filter(Boolean) || [];
        const fileNumbers = dData.vehicleIds?.map(vehicle => vehicle.fileNo).filter(Boolean) || [];
        
        return {
          _id: dData._id,
          plateNo: plateNumbers,
          fileNo: fileNumbers,
          vehicleIds: dData.vehicleIds || [],
          vehicleCount: dData.vehicleIds?.length || 0,
          ownerRepresentativeName: dData.ownerRepresentativeName,
          fullname: dData.fullname,
          birthDate: dData.birthDate,
          contactNumber: dData.contactNumber,
          emailAddress: dData.emailAddress,
          address: dData.address || {},
          province: dData.address?.province || dData.province,
          municipality: dData.address?.municipality || dData.municipality,
          barangay: dData.address?.barangay || dData.barangay,
          purok: dData.address?.purok,
          hasDriversLicense: dData.hasDriversLicense,
          driversLicenseNumber: dData.driversLicenseNumber,
          isActive: dData.isActive,
          deletedAt: dData.deletedAt,
          createdBy: dData.createdBy,
          createdAt: dData.createdAt,
          updatedBy: dData.updatedBy,
          updatedAt: dData.updatedAt,
        };
      });

      setDriverData(driverData);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch deleted owners");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (driver) => {
    setDriverToRestore(driver);
    setShowRestoreAlert(true);
  };

  const confirmRestore = async () => {
    if (!driverToRestore) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.patch(`/owner/bin/${driverToRestore._id}/restore`, {}, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Owner restored successfully");
      fetchDeletedDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore owner");
    } finally {
      setIsSubmitting(false);
      setShowRestoreAlert(false);
      setDriverToRestore(null);
    }
  };

  const cancelRestore = () => {
    setShowRestoreAlert(false);
    setDriverToRestore(null);
  };

  const handlePermanentDelete = (driver) => {
    setDriverToDelete(driver);
    setShowDeleteAlert(true);
  };

  const confirmPermanentDelete = async () => {
    if (!driverToDelete) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.delete(`/owner/bin/${driverToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Owner permanently deleted successfully");
      fetchDeletedDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to permanently delete owner");
    } finally {
      setIsSubmitting(false);
      setShowDeleteAlert(false);
      setDriverToDelete(null);
    }
  };

  const cancelPermanentDelete = () => {
    setShowDeleteAlert(false);
    setDriverToDelete(null);
  };

  const handleBack = () => {
    navigate("/owner");
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
          <header className="text-xl md:text-2xl lg:text-3xl font-bold">Owners Bin</header>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <DriversTable
            data={driverData}
            filters={["ownerRepresentativeName", "emailAddress", "province", "municipality", "barangay"]}
            tableColumn={driverBinColumns}
            onAdd={null}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={null}
            onDelete={null}
            onBinClick={null}
            onFileNumberClick={null}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            submitting={submitting}
          />
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <ConfirmationDIalog
        open={showRestoreAlert}
        onOpenChange={setShowRestoreAlert}
        confirm={confirmRestore}
        cancel={cancelRestore}
        title="Restore this owner?"
        description="This action will restore the owner and make it available again in the main list."
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmPermanentDelete}
        cancel={cancelPermanentDelete}
        title="Permanently delete this owner?"
        description="This action cannot be undone. The owner will be permanently removed from the database."
      />
    </div>
  );
};

export default OwnerBinPage;

