import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accidentColumns } from "@/components/table/columns";
import AccidentTable from "@/components/accidents/AccidentTable";

const AccidentPage = () => {
  const [accidentData, setAccidentData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setIsSubmitting] = useState(false);

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
        driver_id: aData.driver_id?.licenseNo || "N/A",
        vehicle_id: aData.vehicle_id?.plateNo || "N/A",
        accident_date: formatSimpleDate(aData.accident_date),
        street: aData.street,
        barangay: aData.barangay,
        municipality: aData.municipality,
      }));
      setAccidentData(accidentData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    navigate(`${location.pathname}/create`);
  };

  const onRowClick = (data) => {
    const accidentId = data._id;
    navigate(`/accident/${accidentId}`);
  };

  const onEdit = (accidentId) => {
    navigate(`/accident/${accidentId}/edit`);
  };

  return (
    <div className="p-4">
      <header className="text-xl md:text-3xl font-bold mb-5">Accidents</header>
      <section>
        <AccidentTable
          data={accidentData}
          filters={["accident_id", "driver_id", "vehicle_id", "accident_date", "street", "barangay", "municipality"]}
          tableColumn={accidentColumns}
          onAdd={handleAdd}
          loading={loading}
          onRowClick={onRowClick}
          onEdit={onEdit}
          onUpdateStatus={() => {}}
          submitting={submitting}
        />
      </section>
    </div>
  );
};

export default AccidentPage;
