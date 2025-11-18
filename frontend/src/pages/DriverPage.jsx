import apiClient from "@/api/axios";
import { driverColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { createCategoryMap } from "@/util/helper";
import { formatSimpleDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DriversTable from "@/components/drivers/DriversTable";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import EditDriverModal from "@/components/driver/EditDriverModal";
import DriverModal from "@/components/driver/DriverModal";
import VehicleModal from "@/components/vehicle/VehicleModal";
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
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [editDriverModalOpen, setEditDriverModalOpen] = useState(false);
  const [driverProfileModalOpen, setDriverProfileModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [selectedFileNumber, setSelectedFileNumber] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  /**
   * fetchDrivers - Optimized driver fetching with pagination
   * 
   * IMPROVEMENTS:
   * - Uses server-side pagination with limit (100 items) instead of fetching all
   * - Reduces initial payload size significantly
   */
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      
      // Use pagination with reasonable limit instead of fetching all
      const { data } = await apiClient.get("/owner?page=1&limit=100", {
        headers: {
          Authorization: token,
        },
      });

      if (!data.data || !Array.isArray(data.data)) {
        setDriverData([]);
        return;
      }

      const driverData = data.data.map((dData) => {
        // Extract plate numbers and file numbers from vehicleIds array
        const plateNumbers = dData.vehicleIds?.map(vehicle => vehicle.plateNo).filter(Boolean) || [];
        const fileNumbers = dData.vehicleIds?.map(vehicle => vehicle.fileNo).filter(Boolean) || [];
        
        return {
          _id: dData._id,
          plateNo: plateNumbers, // Now an array of plate numbers
          fileNo: fileNumbers, // Now an array of file numbers
          vehicleIds: dData.vehicleIds || [], // Keep the full vehicle objects
          vehicleCount: dData.vehicleIds?.length || 0, // Count of vehicles
          ownerRepresentativeName: dData.ownerRepresentativeName,
          fullname: dData.fullname,
          birthDate: dData.birthDate, // Keep as Date object for proper handling in columns
          contactNumber: dData.contactNumber, // Add contact number
          emailAddress: dData.emailAddress,
          address: dData.address || {}, // Keep the full address object
          province: dData.address?.province || dData.province,
          municipality: dData.address?.municipality || dData.municipality,
          barangay: dData.address?.barangay || dData.barangay,
          purok: dData.address?.purok, // Add purok field
          hasDriversLicense: dData.hasDriversLicense,
          driversLicenseNumber: dData.driversLicenseNumber,
          isActive: dData.isActive,
          // Include metadata fields
          createdBy: dData.createdBy,
          createdAt: dData.createdAt,
          updatedBy: dData.updatedBy,
          updatedAt: dData.updatedAt,
        };
      });

      // Show only active owners by default (you can change this if you want to show all)
      const active = driverData.filter((data) => data.isActive);
      
      setDriverData(active);

      setLoading(false);
    } catch (error) {
      setDriverData([]);
      setLoading(false);
    }
  };


  const onManage = (data) => {
    setSelectedDriver(data);
    setDriverProfileModalOpen(true);
  };

  const onEdit = (driverId) => {
    const driver = driverData.find(d => d._id === driverId);
    
    if (driver) {
      setSelectedDriver(driver);
      setEditDriverModalOpen(true);
    } else {
      toast.error("Owner not found", {
        description: "The selected owner could not be found."
      });
    }
  };

  const handleNavigate = () => {
    navigate(`${location.pathname}/inactive`);
  };

  const handleDeactivate = (data) => {
    setShowAlert(true);
    setSelectedDriver(data)
  };

  const confirmDeactivate = () => {
    onDelete(false); // Call the delete function
    setShowAlert(false); // Close the alert dialog after deleting
  };

  const cancelDeactivate = () => {
    setShowAlert(false); // Close the alert dialog without deleting
  };

  const handleFileNumberClick = (fileNumber) => {
    setSelectedFileNumber(fileNumber);
    setVehicleModalOpen(true);
  };

  const handleDriverUpdated = (updatedDriver) => {
    // Ensure updatedDriver has the required structure
    if (!updatedDriver || !updatedDriver._id) {
      toast.error("Failed to update owner data", {
        description: "The updated owner information is invalid."
      });
      return;
    }

    // Update the driver data with the updated information
    setDriverData(prevData => 
      prevData.map(driver => {
        if (driver._id === updatedDriver._id) {
          // Merge the updated data with the existing driver data structure
          return {
            ...driver,
            ...updatedDriver,
            // Ensure vehicleIds array is preserved
            vehicleIds: updatedDriver.vehicleIds || driver.vehicleIds || [],
            // Recalculate plate numbers and file numbers
            plateNo: updatedDriver.vehicleIds?.map(vehicle => vehicle.plateNo).filter(Boolean) || driver.plateNo || [],
            fileNo: updatedDriver.vehicleIds?.map(vehicle => vehicle.fileNo).filter(Boolean) || driver.fileNo || [],
            vehicleCount: updatedDriver.vehicleIds?.length || driver.vehicleCount || 0,
          };
        }
        return driver;
      })
    );
    
    // Close the profile modal
    setDriverProfileModalOpen(false);
    
    // Show success message
    toast.success("Owner updated successfully", {
      description: "The owner information has been updated in the table."
    });
  };

  const handleDelete = (driver) => {
    setDriverToDelete(driver);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;
    
    try {
      await apiClient.delete(`/owner/${driverToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Owner moved to bin successfully");
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete owner");
    } finally {
      setShowDeleteAlert(false);
      setDriverToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
    setDriverToDelete(null);
  };

  const handleBinClick = () => {
    navigate("/owner/bin");
  };

  const onDelete = async (data) => {
    const promise = async () => {
      try {
        const response = await apiClient.patch(
          `/owner/${selectedDriver}`,
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
      success: `Owner deactivated`,
      error: (error) => error.message || "Failed to update owner",
    });
  };



  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 flex-shrink-0">Owners</header>
        <div className="flex-1 flex flex-col min-h-0">
          <DriversTable
            data={driverData}
            filters={["fullname", "plateNo", "ownerRepresentativeName", "municipality", "barangay"]}
            tableColumn={driverColumns}
            loading={loading}
            onRowClick={onManage}
            onEdit={onEdit}
            onDelete={handleDelete}
            onNavigate={handleNavigate}
            onFileNumberClick={handleFileNumberClick}
            onBinClick={handleBinClick}
          />
        </div>
      </div>
      <ConfirmationDIalog
        open={showAlert}
        onOpenChange={setShowAlert}
        confirm={confirmDeactivate}
        cancel={cancelDeactivate}
        title={"Are you sure?"}
        description={
          "This action cannot be undone. This will deactivate the owner."
        }
      />


      {/* Driver Profile Modal */}
      <DriverModal
        open={driverProfileModalOpen}
        onOpenChange={setDriverProfileModalOpen}
        driverData={selectedDriver}
        onFileNumberClick={handleFileNumberClick}
        onDriverUpdated={handleDriverUpdated}
      />

      {/* Edit Driver Modal */}
      <EditDriverModal
        open={editDriverModalOpen}
        onOpenChange={setEditDriverModalOpen}
        driverData={selectedDriver}
        onDriverUpdated={handleDriverUpdated}
      />

      {/* Vehicle Modal */}
      <VehicleModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        fileNumber={selectedFileNumber}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmDelete}
        cancel={cancelDelete}
        title="Do you want to delete this?"
        description="This action will move the owner to bin. You can restore it later from the bin."
      />
    </div>
  );
};

export default DriverPage;
