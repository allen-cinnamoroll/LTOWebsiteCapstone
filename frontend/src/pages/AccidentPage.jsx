import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accidentColumns } from "@/components/table/columns";
import AccidentTable from "@/components/accidents/AccidentTable";
import AddAccidentModal from "@/components/accidents/AddAccidentModal";

const AccidentPage = () => {
  const [accidentData, setAccidentData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);
  const [addAccidentModalOpen, setAddAccidentModalOpen] = useState(false);

  useEffect(() => {
    fetchAccidents();
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
    const accidentId = data._id;
    navigate(`/accident/${accidentId}`);
  };

  const onEdit = (accidentId) => {
    navigate(`/accident/${accidentId}/edit`);
  };

  const handleAccidentAdded = () => {
    // Refresh the accident list when a new accident is added
    fetchAccidents();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex-1 flex flex-col min-h-0">
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
    </div>
  );
};

export default AccidentPage;
