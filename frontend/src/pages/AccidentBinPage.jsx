import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accidentBinColumns } from "@/components/table/columns";
import AccidentTable from "@/components/accidents/AccidentTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AccidentBinPage = () => {
  const [accidentData, setAccidentData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [showRestoreAlert, setShowRestoreAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [accidentToRestore, setAccidentToRestore] = useState(null);
  const [accidentToDelete, setAccidentToDelete] = useState(null);

  useEffect(() => {
    fetchDeletedAccidents();
  }, []);

  const fetchDeletedAccidents = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/accident/bin?page=1&limit=100", {
        headers: {
          Authorization: token,
        },
      });
      const accidentData = data.data.map((aData) => ({
        _id: aData._id,
        blotterNo: aData.blotterNo,
        vehiclePlateNo: aData.vehiclePlateNo || "",
        vehicleMCPlateNo: aData.vehicleMCPlateNo || "",
        vehicleChassisNo: aData.vehicleChassisNo || "",
        suspect: aData.suspect || "",
        stageOfFelony: aData.stageOfFelony || "",
        offense: aData.offense || "",
        offenseType: aData.offenseType || "",
        narrative: aData.narrative || "",
        caseStatus: aData.caseStatus || "",
        region: aData.region || "",
        province: aData.province || "",
        municipality: aData.municipality,
        barangay: aData.barangay,
        street: aData.street,
        lat: aData.lat,
        lng: aData.lng,
        dateEncoded: aData.dateEncoded,
        dateReported: aData.dateReported,
        timeReported: aData.timeReported || "",
        dateCommited: formatSimpleDate(aData.dateCommited),
        timeCommited: aData.timeCommited || "",
        incidentType: aData.incidentType || "",
        deletedAt: aData.deletedAt,
        createdBy: aData.createdBy,
        updatedBy: aData.updatedBy,
        createdAt: aData.createdAt,
        updatedAt: aData.updatedAt,
      }));
      setAccidentData(accidentData);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch deleted accidents");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (accident) => {
    setAccidentToRestore(accident);
    setShowRestoreAlert(true);
  };

  const confirmRestore = async () => {
    if (!accidentToRestore) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.patch(`/accident/bin/${accidentToRestore._id}/restore`, {}, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Accident restored successfully");
      fetchDeletedAccidents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore accident");
    } finally {
      setIsSubmitting(false);
      setShowRestoreAlert(false);
      setAccidentToRestore(null);
    }
  };

  const cancelRestore = () => {
    setShowRestoreAlert(false);
    setAccidentToRestore(null);
  };

  const handlePermanentDelete = (accident) => {
    setAccidentToDelete(accident);
    setShowDeleteAlert(true);
  };

  const confirmPermanentDelete = async () => {
    if (!accidentToDelete) return;
    
    try {
      setIsSubmitting(true);
      await apiClient.delete(`/accident/bin/${accidentToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Accident permanently deleted successfully");
      fetchDeletedAccidents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to permanently delete accident");
    } finally {
      setIsSubmitting(false);
      setShowDeleteAlert(false);
      setAccidentToDelete(null);
    }
  };

  const cancelPermanentDelete = () => {
    setShowDeleteAlert(false);
    setAccidentToDelete(null);
  };

  const handleBack = () => {
    navigate("/accident");
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
          <header className="text-xl md:text-2xl lg:text-3xl font-bold">Incidents Bin</header>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <AccidentTable
            data={accidentData}
            filters={["blotterNo", "vehiclePlateNo", "incidentType", "suspect", "dateCommited", "caseStatus", "municipality", "barangay"]}
            tableColumn={accidentBinColumns}
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
        title="Restore this accident?"
        description="This action will restore the accident and make it available again in the main list."
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmPermanentDelete}
        cancel={cancelPermanentDelete}
        title="Permanently delete this accident?"
        description="This action cannot be undone. The accident will be permanently removed from the database."
      />
    </div>
  );
};

export default AccidentBinPage;

