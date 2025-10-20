import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { violationColumns } from "@/components/table/columns";
import ViolationTable from "@/components/violations/ViolationTable";
import AddViolationModal from "@/components/violations/AddViolationModal";
import ViolationDetailsModal from "@/components/violations/ViolationDetailsModal";
import EditViolationModal from "@/components/violations/EditViolationModal";

const ViolationPage = () => {
  const [violationData, setViolationData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [addViolationModalOpen, setAddViolationModalOpen] = useState(false);
  const [violationDetailsModalOpen, setViolationDetailsModalOpen] = useState(false);
  const [editViolationModalOpen, setEditViolationModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [selectedViolationId, setSelectedViolationId] = useState(null);

  useEffect(() => {
    fetchViolations();
  }, []);

  // Listen for edit violation events from details modal
  useEffect(() => {
    const handleEditViolation = (event) => {
      setSelectedViolationId(event.detail);
      setEditViolationModalOpen(true);
    };

    window.addEventListener('editViolation', handleEditViolation);
    return () => {
      window.removeEventListener('editViolation', handleEditViolation);
    };
  }, []);

  const fetchViolations = async () => {
    try {
      const { data } = await apiClient.get("/violations", {
        headers: {
          Authorization: token,
        },
      });
      
      // Debug: Log the first violation to see what fields are available
      if (data.data && data.data.length > 0) {
        console.log("Sample violation data from API:", data.data[0]);
        console.log("Available fields:", Object.keys(data.data[0]));
        console.log("CreatedAt:", data.data[0].createdAt);
        console.log("UpdatedAt:", data.data[0].updatedAt);
      }
      
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
        dateOfApprehension: vData.dateOfApprehension,
        apprehendingOfficer: vData.apprehendingOfficer || "N/A",
        createdAt: vData.createdAt,
        updatedAt: vData.updatedAt,
      }));
      setViolationData(violationData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setAddViolationModalOpen(true);
  };

  const onRowClick = (data) => {
    setSelectedViolation(data);
    setViolationDetailsModalOpen(true);
  };

  const onEdit = (violationId) => {
    setSelectedViolationId(violationId);
    setEditViolationModalOpen(true);
  };

  const handleViolationAdded = () => {
    // Refresh the violation list when a new violation is added
    fetchViolations();
  };

  const handleViolationUpdated = () => {
    // Refresh the violation list when a violation is updated
    fetchViolations();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex-1 flex flex-col min-h-0">
        <header className="text-xl md:text-3xl font-bold mb-4 flex-shrink-0">Violations</header>
        <div className="flex-1 flex flex-col min-h-0">
          <ViolationTable
            data={violationData}
            filters={["topNo", "firstName", "lastName", "violations", "violationType", "licenseType", "plateNo", "dateOfApprehension", "apprehendingOfficer"]}
            tableColumn={violationColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onUpdateStatus={() => {}}
            submitting={submitting}
          />
        </div>
      </div>

      {/* Add Violation Modal */}
      <AddViolationModal
        open={addViolationModalOpen}
        onOpenChange={setAddViolationModalOpen}
        onViolationAdded={handleViolationAdded}
      />

      {/* Violation Details Modal */}
      <ViolationDetailsModal
        open={violationDetailsModalOpen}
        onOpenChange={setViolationDetailsModalOpen}
        violationData={selectedViolation}
      />

      {/* Edit Violation Modal */}
      <EditViolationModal
        open={editViolationModalOpen}
        onOpenChange={setEditViolationModalOpen}
        violationId={selectedViolationId}
        onViolationUpdated={handleViolationUpdated}
      />
    </div>
  );
};

export default ViolationPage;
