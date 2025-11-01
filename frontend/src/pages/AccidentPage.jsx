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

  useEffect(() => {
    fetchAccidents();
  }, []);

  // Listen for edit accident events from details modal
  useEffect(() => {
    const handleEditAccident = (event) => {
      setSelectedAccidentId(event.detail);
      setEditAccidentModalOpen(true);
    };

    window.addEventListener('editAccident', handleEditAccident);
    return () => {
      window.removeEventListener('editAccident', handleEditAccident);
    };
  }, []);

  const fetchAccidents = async () => {
    try {
      const { data } = await apiClient.get("/accident", {
        headers: {
          Authorization: token,
        },
      });
      const accidentData = data.data.map((aData) => ({
        _id: aData._id,
        accident_id: aData.accident_id,
        plateNo: aData.plateNo || "N/A",
        accident_date: formatSimpleDate(aData.accident_date),
        street: aData.street,
        barangay: aData.barangay,
        municipality: aData.municipality,
        vehicle_type: aData.vehicle_type || "N/A",
        severity: aData.severity || "N/A",
        notes: aData.notes || "",
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
  };

  const handleAccidentAdded = () => {
    // Refresh the accident list when a new accident is added
    fetchAccidents();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-6 pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-3xl font-bold mb-4 flex-shrink-0">Accidents</header>
        <div className="flex-1 flex flex-col min-h-0">
          <AccidentTable
            data={accidentData}
            filters={["accident_id", "plateNo", "accident_date", "street", "barangay", "municipality", "vehicle_type", "severity"]}
            tableColumn={accidentColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={onEdit}
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
        onOpenChange={setAccidentDetailsModalOpen}
        accidentData={selectedAccident}
        onEdit={onEdit}
      />

      {/* Edit Accident Modal */}
      <EditAccidentModal
        open={editAccidentModalOpen}
        onOpenChange={setEditAccidentModalOpen}
        accidentId={selectedAccidentId}
        onAccidentUpdated={handleAccidentAdded}
      />
    </div>
  );
};

export default AccidentPage;
