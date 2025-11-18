import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { violationColumns } from "@/components/table/columns";
import ViolationTable from "@/components/violations/ViolationTable";
import ViolationEntryModal from "@/components/violations/ViolationEntryModal";
import ViolationInformationModal from "@/components/violations/ViolationInformationModal";
import ViolationDetailsModal from "@/components/violations/ViolationDetailsModal";
import EditViolationModal from "@/components/violations/EditViolationModal";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";

const ViolationPage = () => {
  const [violationData, setViolationData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [addViolationModalOpen, setAddViolationModalOpen] = useState(false);
  const [violationInformationModalOpen, setViolationInformationModalOpen] = useState(false);
  const [violationDetailsModalOpen, setViolationDetailsModalOpen] = useState(false);
  const [editViolationModalOpen, setEditViolationModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [selectedViolationForDetails, setSelectedViolationForDetails] = useState(null);
  const [selectedViolationId, setSelectedViolationId] = useState(null);
  const [initialViolator, setInitialViolator] = useState(null);
  const [shouldReopenInformationModal, setShouldReopenInformationModal] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [violationToDelete, setViolationToDelete] = useState(null);

  useEffect(() => {
    fetchViolations();
  }, []);


  // Listen for open violation entry with pre-filled violator
  useEffect(() => {
    const handleOpenViolationEntry = (event) => {
      setInitialViolator(event.detail);
      setAddViolationModalOpen(true);
    };

    window.addEventListener('openViolationEntry', handleOpenViolationEntry);
    return () => {
      window.removeEventListener('openViolationEntry', handleOpenViolationEntry);
    };
  }, []);

  // Listen for open violation details from information modal
  useEffect(() => {
    const handleOpenViolationDetails = (event) => {
      // Check if event detail has the new structure with reopenInformationModal flag
      if (event.detail && typeof event.detail === 'object' && 'violation' in event.detail) {
        // New structure: { violation, reopenInformationModal }
        setShouldReopenInformationModal(event.detail.reopenInformationModal || false);
        setSelectedViolationForDetails(event.detail.violation);
      } else {
        // Old structure: just the violation object (for backward compatibility)
        setShouldReopenInformationModal(false);
        setSelectedViolationForDetails(event.detail);
      }
      setViolationDetailsModalOpen(true);
    };

    window.addEventListener('openViolationDetails', handleOpenViolationDetails);
    return () => {
      window.removeEventListener('openViolationDetails', handleOpenViolationDetails);
    };
  }, []);

  /**
   * fetchViolations - Optimized violation fetching with pagination
   * 
   * IMPROVEMENTS:
   * - Uses server-side pagination with limit (100 items) instead of fetching all
   * - Reduces initial payload size significantly
   */
  const fetchViolations = async () => {
    try {
      // Use pagination with reasonable limit instead of fetching all
      const { data } = await apiClient.get("/violations?page=1&limit=100", {
        headers: {
          Authorization: token,
        },
      });
      
      const violationData = data.data.map((vData) => ({
        _id: vData._id,
        topNo: vData.topNo || "N/A",
        firstName: vData.firstName || "N/A",
        middleInitial: vData.middleInitial || "",
        lastName: vData.lastName || "N/A",
        suffix: vData.suffix || "",
        violations: vData.violations || [],
        violationType: vData.violationType || "confiscated",
        licenseType: vData.licenseType || null,
        plateNo: vData.plateNo || "N/A",
        chassisNo: vData.chassisNo || null,
        engineNo: vData.engineNo || null,
        fileNo: vData.fileNo || null,
        dateOfApprehension: vData.dateOfApprehension,
        apprehendingOfficer: vData.apprehendingOfficer || "N/A",
        createdAt: vData.createdAt,
        updatedAt: vData.updatedAt,
        createdBy: vData.createdBy,
        updatedBy: vData.updatedBy,
      }));
      setViolationData(violationData);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setInitialViolator(null);
    setAddViolationModalOpen(true);
  };

  const onRowClick = (data) => {
    setSelectedViolation(data);
    setViolationInformationModalOpen(true);
  };

  const onEdit = (violationId) => {
    setSelectedViolationId(violationId);
    setEditViolationModalOpen(true);
    // Close other modals when opening edit
    setViolationDetailsModalOpen(false);
    setViolationInformationModalOpen(false);
  };

  const handleViolationAdded = () => {
    // Refresh the violation list when a new violation is added
    fetchViolations();
  };

  const handleViolationUpdated = () => {
    // Refresh the violation list when a violation is updated
    fetchViolations();
  };

  const handleDelete = (violation) => {
    setViolationToDelete(violation);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!violationToDelete) return;
    
    try {
      await apiClient.delete(`/violations/${violationToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Violation moved to bin successfully");
      fetchViolations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete violation");
    } finally {
      setShowDeleteAlert(false);
      setViolationToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
    setViolationToDelete(null);
  };

  const handleBinClick = () => {
    navigate("/violation/bin");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 flex-shrink-0">Violations</header>
        <div className="flex-1 flex flex-col min-h-0">
          <ViolationTable
            data={violationData}
            filters={["topNo", "firstName", "lastName", "violations", "violationType", "licenseType", "plateNo", "dateOfApprehension", "apprehendingOfficer"]}
            tableColumn={violationColumns}
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

      {/* Violation Entry Modal */}
      <ViolationEntryModal
        open={addViolationModalOpen}
        onOpenChange={(isOpen) => {
          setAddViolationModalOpen(isOpen);
          if (!isOpen) {
            setInitialViolator(null);
          }
        }}
        onViolationAdded={handleViolationAdded}
        initialViolator={initialViolator}
      />

      {/* Violation Information Modal */}
      <ViolationInformationModal
        open={violationInformationModalOpen}
        onOpenChange={setViolationInformationModalOpen}
        violationData={selectedViolation}
        allViolations={violationData}
      />

      {/* Violation Details Modal */}
      <ViolationDetailsModal
        open={violationDetailsModalOpen}
        onOpenChange={(isOpen) => {
          setViolationDetailsModalOpen(isOpen);
          // If closing and we should reopen information modal, reopen it
          if (!isOpen && shouldReopenInformationModal) {
            setShouldReopenInformationModal(false);
            setViolationInformationModalOpen(true);
          }
          // Close other modals when closing details
          if (!isOpen) {
            setEditViolationModalOpen(false);
          }
        }}
        violationData={selectedViolationForDetails}
        onEditClick={(violationId) => {
          // Close details modal and open edit modal
          setViolationDetailsModalOpen(false);
          onEdit(violationId);
        }}
      />

      {/* Edit Violation Modal */}
      <EditViolationModal
        open={editViolationModalOpen}
        onOpenChange={(isOpen) => {
          setEditViolationModalOpen(isOpen);
          // Close other modals when closing edit (unless canceling to return to details)
          if (!isOpen) {
            // Only close details modal if we're not canceling to return to it
            // The onCancel callback will handle reopening details modal
            if (!violationDetailsModalOpen && !violationInformationModalOpen) {
              // No other modals to close
            }
          }
        }}
        violationId={selectedViolationId}
        onViolationUpdated={handleViolationUpdated}
        onCancel={() => {
          // Close edit modal and reopen details modal
          setEditViolationModalOpen(false);
          if (selectedViolationForDetails) {
            setViolationDetailsModalOpen(true);
          } else if (selectedViolation) {
            // If we came from information modal, reopen that instead
            setViolationInformationModalOpen(true);
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
        description="This action will move the violation to bin. You can restore it later from the bin."
      />
    </div>
  );
};

export default ViolationPage;
