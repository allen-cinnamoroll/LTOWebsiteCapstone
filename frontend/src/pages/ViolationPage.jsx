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
  const [allViolationsData, setAllViolationsData] = useState([]); // Keep all violations for modal
  const { token, userData } = useAuth();
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
  const [currentTypeFilter, setCurrentTypeFilter] = useState("all");

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
      // Fetch all violations to enable correct pagination display
      const { data } = await apiClient.get("/violations?fetchAll=true", {
        headers: {
          Authorization: token,
        },
      });
      
      const allViolations = data.data.map((vData) => ({
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

      // Separate alarm violations from non-alarm violations
      // Alarm violations should NOT be deduplicated (allow duplicates)
      const alarmViolations = allViolations.filter(v => v.violationType === "alarm");
      const nonAlarmViolations = allViolations.filter(v => v.violationType !== "alarm");

      // Deduplicate by name: group non-alarm violations by unique name combination
      // Count topNo records per person instead of violations array items
      const nameMap = new Map();
      
      nonAlarmViolations.forEach((violation) => {
        // Create a unique key from name components
        const nameKey = `${violation.firstName || "N/A"}_${violation.lastName || "N/A"}_${violation.middleInitial || ""}_${violation.suffix || ""}`;
        
        const violationType = violation.violationType;
        const hasTopNo = violation.topNo && violation.topNo !== "N/A";
        
        if (!nameMap.has(nameKey)) {
          // First occurrence of this name, add it with aggregated data
          const topNoByType = {};
          if (hasTopNo) {
            topNoByType[violationType] = new Set([violation.topNo]);
          }
          nameMap.set(nameKey, {
            ...violation,
            violationTypes: new Set([violationType]),
            totalViolationsCount: hasTopNo ? 1 : 0, // Count topNo records, not violations array
            topNoCount: hasTopNo ? 1 : 0, // Track count of topNo records
            topNoSet: hasTopNo ? new Set([violation.topNo]) : new Set(), // Track unique topNo values
            topNoByType: topNoByType, // Track topNo by type to avoid double counting
            violationsByType: {
              [violationType]: hasTopNo ? 1 : 0
            }
          });
        } else {
          // Name already exists, aggregate data
          const existing = nameMap.get(nameKey);
          existing.violationTypes.add(violationType);
          // Count all topNo records (not just unique) - each topNo represents one violation record
          if (hasTopNo) {
            existing.topNoSet.add(violation.topNo);
            existing.totalViolationsCount = existing.topNoSet.size; // Count unique topNo records
            existing.topNoCount = existing.topNoSet.size;
          }
          if (!existing.violationsByType) {
            existing.violationsByType = {};
          }
          // Count topNo records by type - only count if this is a new topNo for this type
          if (hasTopNo) {
            // Track topNo by type to avoid double counting
            if (!existing.topNoByType) {
              existing.topNoByType = {};
            }
            if (!existing.topNoByType[violationType]) {
              existing.topNoByType[violationType] = new Set();
            }
            if (!existing.topNoByType[violationType].has(violation.topNo)) {
              existing.topNoByType[violationType].add(violation.topNo);
              existing.violationsByType[violationType] = (existing.violationsByType[violationType] || 0) + 1;
            }
          }
          
          // Keep the one with the most recent dateOfApprehension as base
          const existingDate = existing.dateOfApprehension ? new Date(existing.dateOfApprehension) : new Date(0);
          const currentDate = violation.dateOfApprehension ? new Date(violation.dateOfApprehension) : new Date(0);
          
          if (currentDate > existingDate) {
            // Update base violation but keep aggregated data
            const baseViolation = { ...violation };
            baseViolation.violationTypes = existing.violationTypes;
            baseViolation.totalViolationsCount = existing.totalViolationsCount;
            baseViolation.topNoCount = existing.topNoCount;
            baseViolation.topNoSet = existing.topNoSet;
            baseViolation.topNoByType = existing.topNoByType;
            baseViolation.violationsByType = existing.violationsByType;
            nameMap.set(nameKey, baseViolation);
          }
        }
      });

      // Process alarm violations - keep all as separate entries (alarm can be duplicated)
      const processedAlarmViolations = alarmViolations.map(violation => {
        const nameKey = `${violation.firstName || "N/A"}_${violation.lastName || "N/A"}_${violation.middleInitial || ""}_${violation.suffix || ""}`;
        
        const hasTopNo = violation.topNo && violation.topNo !== "N/A";
        const topNoCount = hasTopNo ? 1 : 0;
        
        // If this name exists in non-alarm map, also add alarm type to that entry
        if (nameMap.has(nameKey)) {
          const existing = nameMap.get(nameKey);
          existing.violationTypes.add("alarm");
          // Count unique topNo records instead of violations array items
          if (hasTopNo) {
            existing.topNoSet.add(violation.topNo);
            existing.totalViolationsCount = existing.topNoSet.size;
            existing.topNoCount = existing.topNoSet.size;
          }
          if (!existing.violationsByType) {
            existing.violationsByType = {};
          }
          // Track topNo by type to avoid double counting
          if (hasTopNo) {
            if (!existing.topNoByType) {
              existing.topNoByType = {};
            }
            if (!existing.topNoByType["alarm"]) {
              existing.topNoByType["alarm"] = new Set();
            }
            if (!existing.topNoByType["alarm"].has(violation.topNo)) {
              existing.topNoByType["alarm"].add(violation.topNo);
              existing.violationsByType["alarm"] = (existing.violationsByType["alarm"] || 0) + 1;
            }
          }
        }
        
        // Always return alarm violation as separate entry (alarm can be duplicated)
        return {
          ...violation,
          violationTypes: new Set([violation.violationType]),
          totalViolationsCount: topNoCount, // Count topNo records
          topNoCount: topNoCount,
          violationsByType: {
            [violation.violationType]: topNoCount
          }
        };
      });

      // Convert violationTypes Set to Array for easier use in components
      const deduplicatedNonAlarm = Array.from(nameMap.values()).map(v => ({
        ...v,
        violationTypes: Array.from(v.violationTypes)
      }));
      
      const processedAlarm = processedAlarmViolations.map(v => ({
        ...v,
        violationTypes: Array.from(v.violationTypes)
      }));

      const deduplicatedData = [...deduplicatedNonAlarm, ...processedAlarm];
      setViolationData(deduplicatedData);
      // Keep all violations for the modal to show all violations for a person
      setAllViolationsData(allViolations);
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
            filters={["firstName", "lastName", "middleInitial", "violations"]}
            tableColumn={violationColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onDelete={userData?.role === "2" ? null : handleDelete}
            onBinClick={userData?.role === "2" ? null : handleBinClick}
            onUpdateStatus={() => {}}
            submitting={submitting}
            onTypeFilterChange={setCurrentTypeFilter}
            showExport={userData?.role !== "2"}
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
        allViolations={allViolationsData}
        typeFilter={currentTypeFilter}
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
