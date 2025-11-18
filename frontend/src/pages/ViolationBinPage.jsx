import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { violationBinColumns } from "@/components/table/columns";
import ViolationTable from "@/components/violations/ViolationTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ViolationBinPage = () => {
  const [violationData, setViolationData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [showRestoreAlert, setShowRestoreAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [violationToRestore, setViolationToRestore] = useState(null);
  const [violationToDelete, setViolationToDelete] = useState(null);

  useEffect(() => {
    fetchDeletedViolations();
  }, []);

  const fetchDeletedViolations = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/violations/bin?page=1&limit=100", {
        headers: {
          Authorization: token,
        },
      });
      const violationData = data.data.map((vData) => ({
        _id: vData._id,
        topNo: vData.topNo,
        firstName: vData.firstName || "",
        middleInitial: vData.middleInitial || "",
        lastName: vData.lastName || "",
        suffix: vData.suffix || "",
        violations: vData.violations || [],
        violationType: vData.violationType || "",
        licenseType: vData.licenseType || "",
        plateNo: vData.plateNo || "",
        dateOfApprehension: vData.dateOfApprehension ? formatSimpleDate(vData.dateOfApprehension) : "",
        apprehendingOfficer: vData.apprehendingOfficer || "",
        deletedAt: vData.deletedAt,
        createdBy: vData.createdBy,
        updatedBy: vData.updatedBy,
        createdAt: vData.createdAt,
        updatedAt: vData.updatedAt,
      }));
      setViolationData(violationData);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch deleted violations");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (violation) => {
    setViolationToRestore(violation);
    setShowRestoreAlert(true);
  };

  const confirmRestore = async () => {
    if (!violationToRestore) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.patch(`/violations/bin/${violationToRestore._id}/restore`, {}, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Violation restored successfully");
      fetchDeletedViolations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore violation");
    } finally {
      setIsSubmitting(false);
      setShowRestoreAlert(false);
      setViolationToRestore(null);
    }
  };

  const cancelRestore = () => {
    setShowRestoreAlert(false);
    setViolationToRestore(null);
  };

  const handlePermanentDelete = (violation) => {
    setViolationToDelete(violation);
    setShowDeleteAlert(true);
  };

  const confirmPermanentDelete = async () => {
    if (!violationToDelete) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.delete(`/violations/bin/${violationToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Violation permanently deleted successfully");
      fetchDeletedViolations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to permanently delete violation");
    } finally {
      setIsSubmitting(false);
      setShowDeleteAlert(false);
      setViolationToDelete(null);
    }
  };

  const cancelPermanentDelete = () => {
    setShowDeleteAlert(false);
    setViolationToDelete(null);
  };

  const handleBack = () => {
    navigate("/violation");
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
          <header className="text-xl md:text-2xl lg:text-3xl font-bold">Violations Bin</header>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <ViolationTable
            data={violationData}
            filters={["topNo", "firstName", "lastName", "plateNo", "violationType"]}
            tableColumn={violationBinColumns}
            onAdd={null}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={null}
            onDelete={null}
            onBinClick={null}
            onUpdateStatus={null}
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
        title="Restore this violation?"
        description="This action will restore the violation and make it available again in the main list."
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmPermanentDelete}
        cancel={cancelPermanentDelete}
        title="Permanently delete this violation?"
        description="This action cannot be undone. The violation will be permanently removed from the database."
      />
    </div>
  );
};

export default ViolationBinPage;

