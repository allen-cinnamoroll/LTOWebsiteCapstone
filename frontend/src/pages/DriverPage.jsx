import apiClient from "@/api/axios";
import { driverColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { createCategoryMap } from "@/util/helper";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DriversTable from "@/components/drivers/DriversTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import AddDriverModal from "@/components/driver/AddDriverModal";
import { toast } from "sonner";

const sexMap = createCategoryMap({
  0: "Male",
  1: "Female",
});

const civilStatusMap = createCategoryMap({
  0: "Single",
  1: "Married",
  3: "Divorced",
});

const DriverPage = () => {
  const [driverData, setDriverData] = useState([]);
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data } = await apiClient.get("/driver", {
        headers: {
          Authorization: token,
        },
      });

      const driverData = data.data.map((dData) => {
        return {
          _id: dData._id,
          plateNo: dData.plateNo,
          fileNo: dData.fileNo,
          ownerRepresentativeName: dData.ownerRepresentativeName,
          fullname: dData.fullname,
          birthDate: dData.birthDate, // Keep as Date object for proper handling in columns
          municipality: dData.address?.municipality || dData.municipality,
          barangay: dData.address?.barangay || dData.barangay,
          hasDriversLicense: dData.hasDriversLicense,
          driversLicenseNumber: dData.driversLicenseNumber,
          isActive: dData.isActive,
        };
      });

      const active = driverData.filter((data) => data.isActive);
      setDriverData(active);

      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  const handleAdd = async () => {
    setAddDriverModalOpen(true);
  };

  const onManage = (data) => {
    navigate(`/driver/${data._id}`);
  };

  const onEdit = (driverId) => {
    navigate(`/driver/${driverId}/edit`);
  };

  const handleNavigate = () => {
    navigate(`${location.pathname}/inactive`);
  };

  const handleDeactivate = (data) => {
    setShowAlert(true);
    setSelectedDriver(data)
  };

  const confirmDelete = () => {
    onDelete(false); // Call the delete function
    setShowAlert(false); // Close the alert dialog after deleting
  };

  const cancelDelete = () => {
    setShowAlert(false); // Close the alert dialog without deleting
  };

  const onDelete = async (data) => {
    const promise = async () => {
      try {
        const response = await apiClient.patch(
          `/driver/${selectedDriver}`,
          {
            isActive: data,
          },
          {
            headers: {
              Authorization: token,
            },
          }
        );

        return response.data; // Resolve with data for toast success message
      } catch (error) {
        const message = error.response?.data?.message || "An error occurred";
        throw new Error(message); // Reject with error for toast error message
      } finally {
        await fetchDrivers();
      }
    };

    toast.promise(promise(), {
      loading: "Loading...",
      success: `Driver deactivated`,
      error: (error) => error.message || "Failed to update driver",
    });
  };

  const handleDriverAdded = () => {
    // Refresh the driver list when a new driver is added
    fetchDrivers();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex-1 flex flex-col min-h-0">
        <header className="text-xl md:text-3xl font-bold mb-4 flex-shrink-0">Drivers</header>
        <div className="flex-1 flex flex-col min-h-0">
          <DriversTable
            data={driverData}
            filters={["fullname", "plateNo", "ownerRepresentativeName", "municipality", "barangay"]}
            tableColumn={driverColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onManage}
            onEdit={onEdit}
            onDelete={handleDeactivate}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
      <ConfirmationDIalog
        open={showAlert}
        onOpenChange={setShowAlert}
        confirm={confirmDelete}
        cancel={cancelDelete}
        title={"Are you sure?"}
        description={
          "This action cannot be undone. This will deactivate the driver."
        }
      />

      {/* Add Driver Modal */}
      <AddDriverModal
        open={addDriverModalOpen}
        onOpenChange={setAddDriverModalOpen}
        onDriverAdded={handleDriverAdded}
      />
    </div>
  );
};

export default DriverPage;
