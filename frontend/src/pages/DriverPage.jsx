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

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      console.log('=== FETCHING DRIVERS ===');
      
      const { data } = await apiClient.get("/driver", {
        headers: {
          Authorization: token,
        },
      });

      console.log('=== DRIVERS API RESPONSE ===');
      console.log('Response success:', data.success);
      console.log('Total drivers received:', data.data?.length || 0);
      console.log('First driver sample:', data.data?.[0]);

      if (!data.data || !Array.isArray(data.data)) {
        console.error('API response does not contain data array:', data);
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

      console.log('=== PROCESSED DRIVERS ===');
      console.log('Total processed:', driverData.length);
      console.log('Active drivers:', driverData.filter(d => d.isActive).length);
      console.log('Inactive drivers:', driverData.filter(d => !d.isActive).length);

      // Show only active drivers by default (you can change this if you want to show all)
      const active = driverData.filter((data) => data.isActive);
      console.log('Setting active drivers in state:', active.length);
      
      setDriverData(active);

      setLoading(false);
    } catch (error) {
      console.error('=== ERROR FETCHING DRIVERS ===');
      console.error('Error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setDriverData([]);
      setLoading(false);
    }
  };


  const onManage = (data) => {
    setSelectedDriver(data);
    setDriverProfileModalOpen(true);
  };

  const onEdit = (driverId) => {
    console.log('=== ONEDIT FUNCTION ===');
    console.log('Driver ID:', driverId);
    console.log('Driver data array:', driverData);
    
    const driver = driverData.find(d => d._id === driverId);
    console.log('Found driver:', driver);
    
    if (driver) {
      setSelectedDriver(driver);
      setEditDriverModalOpen(true);
    } else {
      console.error('Driver not found with ID:', driverId);
      toast.error("Driver not found", {
        description: "The selected driver could not be found."
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

  const confirmDelete = () => {
    onDelete(false); // Call the delete function
    setShowAlert(false); // Close the alert dialog after deleting
  };

  const cancelDelete = () => {
    setShowAlert(false); // Close the alert dialog without deleting
  };

  const handleFileNumberClick = (fileNumber) => {
    setSelectedFileNumber(fileNumber);
    setVehicleModalOpen(true);
  };

  const handleDriverUpdated = (updatedDriver) => {
    // Ensure updatedDriver has the required structure
    if (!updatedDriver || !updatedDriver._id) {
      console.error('Invalid updated driver data:', updatedDriver);
      toast.error("Failed to update driver data", {
        description: "The updated driver information is invalid."
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
    toast.success("Driver updated successfully", {
      description: "The driver information has been updated in the table."
    });
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



  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-3xl font-bold mb-4 flex-shrink-0">Drivers</header>
        <div className="flex-1 flex flex-col min-h-0">
          <DriversTable
            data={driverData}
            filters={["fullname", "plateNo", "ownerRepresentativeName", "municipality", "barangay"]}
            tableColumn={driverColumns}
            loading={loading}
            onRowClick={onManage}
            onEdit={onEdit}
            onDelete={handleDeactivate}
            onNavigate={handleNavigate}
            onFileNumberClick={handleFileNumberClick}
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
    </div>
  );
};

export default DriverPage;
