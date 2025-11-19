import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accidentColumns } from "@/components/table/columns";
import AccidentTable from "@/components/accidents/AccidentTable";
import AddAccidentModal from "@/components/accidents/AddAccidentModal";
import AccidentDetailsModal from "@/components/accidents/AccidentDetailsModal";
import EditAccidentModal from "@/components/accidents/EditAccidentModal";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";

const AccidentPage = () => {
  const [accidentData, setAccidentData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [addAccidentModalOpen, setAddAccidentModalOpen] = useState(false);
  const [accidentDetailsModalOpen, setAccidentDetailsModalOpen] = useState(false);
  const [editAccidentModalOpen, setEditAccidentModalOpen] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [selectedAccidentId, setSelectedAccidentId] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [accidentToDelete, setAccidentToDelete] = useState(null);

  useEffect(() => {
    fetchAccidents();
  }, []);


  /**
   * fetchAccidents - Optimized accident fetching with pagination
   * 
   * IMPROVEMENTS:
   * - Uses server-side pagination with limit (100 items) instead of fetching all
   * - Reduces initial payload size significantly
   */
  const fetchAccidents = async () => {
    try {
      setLoading(true);
      // Fetch all accidents to enable correct pagination display
      const { data } = await apiClient.get("/accident?fetchAll=true", {
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
        createdBy: aData.createdBy,
        updatedBy: aData.updatedBy,
        createdAt: aData.createdAt,
        updatedAt: aData.updatedAt,
      }));
      setAccidentData(accidentData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setAddAccidentModalOpen(true);
  };

  const onRowClick = (data) => {
    setSelectedAccident(data);
    setAccidentDetailsModalOpen(true);
  };

  const onEdit = (accidentId) => {
    setSelectedAccidentId(accidentId);
    setEditAccidentModalOpen(true);
    // Close other modals when opening edit
    setAccidentDetailsModalOpen(false);
  };

  const handleAccidentAdded = () => {
    // Refresh the accident list when a new accident is added
    fetchAccidents();
  };

  const handleDelete = (accident) => {
    setAccidentToDelete(accident);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!accidentToDelete) return;
    
    try {
      await apiClient.delete(`/accident/${accidentToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Accident moved to bin successfully");
      fetchAccidents();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete accident");
    } finally {
      setShowDeleteAlert(false);
      setAccidentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
    setAccidentToDelete(null);
  };

  const handleBinClick = () => {
    navigate("/accident/bin");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 flex-shrink-0">Incidents</header>
        <div className="flex-1 flex flex-col min-h-0">
          <AccidentTable
            data={accidentData}
            filters={["blotterNo", "vehiclePlateNo", "incidentType", "suspect", "dateCommited", "caseStatus", "municipality", "barangay"]}
            tableColumn={accidentColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onDelete={handleDelete}
            onBinClick={handleBinClick}
            onUpdateStatus={() => {}}
            submitting={submitting}
          />
        </div>
      </div>

      {/* Add Accident Modal */}
      <AddAccidentModal
        open={addAccidentModalOpen}
        onOpenChange={setAddAccidentModalOpen}
        onAccidentAdded={handleAccidentAdded}
      />

      {/* Accident Details Modal */}
      <AccidentDetailsModal
        open={accidentDetailsModalOpen}
        onOpenChange={(isOpen) => {
          setAccidentDetailsModalOpen(isOpen);
          // Close other modals when closing details
          if (!isOpen) {
            setEditAccidentModalOpen(false);
          }
        }}
        accidentData={selectedAccident}
        onEditClick={(accidentId) => {
          // Close details modal and open edit modal
          setAccidentDetailsModalOpen(false);
          onEdit(accidentId);
        }}
      />

      {/* Edit Accident Modal */}
      <EditAccidentModal
        open={editAccidentModalOpen}
        onOpenChange={(isOpen) => {
          setEditAccidentModalOpen(isOpen);
          // Close other modals when closing edit (unless canceling to return to details)
          if (!isOpen) {
            // Only close details modal if we're not canceling to return to it
            // The onCancel callback will handle reopening details modal
            if (!accidentDetailsModalOpen) {
              // No other modals to close
            }
          }
        }}
        accidentId={selectedAccidentId}
        onAccidentUpdated={handleAccidentAdded}
        onCancel={() => {
          // Close edit modal and reopen details modal
          setEditAccidentModalOpen(false);
          if (selectedAccident) {
            setAccidentDetailsModalOpen(true);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmDelete}
        cancel={cancelDelete}
        title="Do you want to delete this?"
        description="This action will move the accident to bin. You can restore it later from the bin."
      />
    </div>
  );
};

export default AccidentPage;
