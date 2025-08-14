import apiClient from "@/api/axios";
import { vehicleColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { createCategoryMap, getFullName } from "@/util/helper";
import { formatDate, formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DriversTable from "@/components/drivers/DriversTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import { toast } from "sonner";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import { X } from "lucide-react";

const classificationMap = createCategoryMap({
  0: "Private",
  1: "For Hire",
  2: "Government",
});

const statusMap = createCategoryMap({
  0: "Expired",
  1: "Active",
});

const VehiclesPage = () => {
  const [vehicleData, setVehicleData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const date = formatDate(Date.now());
  const [submitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data } = await apiClient.get("/vehicle", {
        headers: {
          Authorization: token,
        },
      });

      const vehicleData = data.data.map((dData) => {
        const owner = getFullName(
          dData.owner.firstName,
          dData.owner.lastName,
          dData.owner.middleName
        );

        return {
          _id: dData._id,
          owner: owner,
          plateNo: dData.plateNo,
          color: dData.color,
          type: dData.type,
          make: dData.make,
          series: dData.series,
          classification: classificationMap.get(dData.classification),
          dateRegistered: formatSimpleDate(dData.dateRegistered),
          expirationDate: formatSimpleDate(dData.expirationDate),
          status: statusMap.get(dData.status),
        };
      });

      setVehicleData(vehicleData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  //navigate to add vehicle page
  const handleAdd = async () => {
    navigate(`${location.pathname}/create`);
  };

  //navigate to vehicle page
  const onRowClick = (data) => {
    const vehicleId = data._id;

    navigate(`/vehicle/${vehicleId}`);
  };

  const onEdit = (vehicleId) => {
    navigate(`/vehicle/${vehicleId}/edit`);
  };

  const onUpdateStatus = async ({ vehicleId, newStatus }) => {
    const promise = async () => {
      setIsSubmitting(true)
      try {
        const { data } = await apiClient.patch(
          `/vehicle/${vehicleId}`,
          { status: newStatus === "Expired" ? "0" : "1" },
          {
            headers: {
              Authorization: token,
            },
          }
        );
        await fetchVehicles();
        return data;
      } catch (error) {
        console.log(error);
      } finally{
        setIsSubmitting(false)
      }
    };
    toast.promise(promise(), {
      loading: "Updating Status...",
      success: `Vehicle status updated`,
      error: (error) => error.message || "Failed to update driver",
    });
  };

  return (
    <div className="p-4">
      <header className="text-xl md:text-3xl font-bold mb-5">Vehicles</header>
      <section>
        {/* Call vehicle table component */}
        <VehiclesTable
          data={vehicleData}
          filters={["plateNo", "make", "series", "type", "owner", "status"]}
          tableColumn={vehicleColumns}
          onAdd={handleAdd}
          loading={loading}
          onRowClick={onRowClick}
          onEdit={onEdit}
          onUpdateStatus={onUpdateStatus}
          submitting={submitting}
        />
      </section>
      {/* <ConfirmationDIalog
        open={showAlert}
        onOpenChange={setShowAlert}
        confirm={confirmDelete}
        cancel={cancelDelete}
        title={"Are you sure?"}
        description={
          "This action cannot be undone. This will deactivate the driver."
        }
      /> */}
    </div>
  );
};

export default VehiclesPage;
