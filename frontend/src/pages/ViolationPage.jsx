import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { violationColumns } from "@/components/table/columns";
import ViolationTable from "@/components/violations/ViolationTable";
import AddViolationModal from "@/components/violations/AddViolationModal";

const ViolationPage = () => {
  const [violationData, setViolationData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [addViolationModalOpen, setAddViolationModalOpen] = useState(false);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const { data } = await apiClient.get("/violations", {
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
        dateOfApprehension: vData.dateOfApprehension,
        apprehendingOfficer: vData.apprehendingOfficer || "N/A",
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
    const violationId = data._id;
    navigate(`/violation/${violationId}`);
  };

  const onEdit = (violationId) => {
    navigate(`/violation/${violationId}/edit`);
  };

  const handleViolationAdded = () => {
    // Refresh the violation list when a new violation is added
    fetchViolations();
  };

  return (
    <div className="container mx-auto p-6 bg-white dark:bg-black min-h-screen rounded-lg">
      <header className="text-xl md:text-3xl font-bold mb-5">Violations</header>
      <section>
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
      </section>

      {/* Add Violation Modal */}
      <AddViolationModal
        open={addViolationModalOpen}
        onOpenChange={setAddViolationModalOpen}
        onViolationAdded={handleViolationAdded}
      />
    </div>
  );
};

export default ViolationPage;
