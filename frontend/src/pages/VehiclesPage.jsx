import apiClient from "@/api/axios";
import { vehicleColumns } from "@/components/table/columns";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import VehicleRenewalModal from "@/components/vehicle/VehicleRenewalModal";
import AddVehicleModal from "@/components/vehicle/AddVehicleModal";
import VehicleDetailsModal from "@/components/vehicle/VehicleDetailsModal";
import EditVehicleModal from "@/components/vehicle/EditVehicleModal";
import ConfirmationDIalog from "@/components/dialog/ConfirmationDIalog";
import AddDriverModal from "@/components/driver/AddDriverModal";
import { toast } from "sonner";


const VehiclesPage = () => {
  const [vehicleData, setVehicleData] = useState([]);
  const { token, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const date = formatDate(Date.now());
  const [submitting, setIsSubmitting] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [tableRenewalModalOpen, setTableRenewalModalOpen] = useState(false);
  const [addVehicleModalOpen, setAddVehicleModalOpen] = useState(false);
  const [addOwnerModalOpen, setAddOwnerModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editVehicleModalOpen, setEditVehicleModalOpen] = useState(false);
  const [editOwnerModalOpen, setEditOwnerModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editOpenedFromDetails, setEditOpenedFromDetails] = useState(false);
  const [renewingVehicle, setRenewingVehicle] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  
  // Vehicle form data state - lifted to page level for persistence across modal transitions
  const [vehicleFormData, setVehicleFormData] = useState({
    plateNo: "",
    fileNo: "",
    engineNo: "",
    chassisNo: "",
    make: "",
    bodyType: "",
    color: "",
    classification: undefined,
    dateOfRenewal: undefined,
    vehicleStatusType: "",
    driver: "",
  });
  
  // Edit vehicle form data state - separate from add vehicle form data
  const [editVehicleFormData, setEditVehicleFormData] = useState({
    plateNo: "",
    fileNo: "",
    engineNo: "",
    chassisNo: "",
    make: "",
    bodyType: "",
    color: "",
    classification: undefined,
    dateOfRenewal: undefined,
    vehicleStatusType: "",
    driver: "",
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  /**
   * fetchVehicles - Optimized vehicle fetching with pagination
   * 
   * IMPROVEMENTS:
   * - Uses server-side pagination with limit (100 items) instead of fetchAll
   * - Reduces initial payload size significantly
   * - For very large datasets (>1000 vehicles), consider implementing full server-side pagination
   *   in VehiclesTable component (currently uses client-side pagination)
   */
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      
      // Fetch all vehicles to enable correct pagination display
      const { data } = await apiClient.get("/vehicle?fetchAll=true", {
        headers: {
          Authorization: token,
        },
      });

      if (!data.data || !Array.isArray(data.data)) {
        setVehicleData([]);
        return;
      }

      const vehicleData = data.data.map((dData) => {
        // Handle both populated and non-populated ownerId
        const ownerId = typeof dData.ownerId === 'object' && dData.ownerId?._id 
          ? dData.ownerId._id 
          : dData.ownerId;
        
        return {
          _id: dData._id,
          plateNo: dData.plateNo,
          fileNo: dData.fileNo,
          engineNo: dData.engineNo,
          chassisNo: dData.serialChassisNumber,
          make: dData.make,
          bodyType: dData.bodyType,
          color: dData.color,
          classification: dData.classification,
          dateOfRenewal: dData.dateOfRenewal,
          status: dData.status,
          ownerId: ownerId, // Use the extracted ownerId
          vehicleStatusType: dData.vehicleStatusType, // Include vehicleStatusType
          // Include metadata fields
          createdBy: dData.createdBy,
          createdAt: dData.createdAt,
          updatedBy: dData.updatedBy,
          updatedAt: dData.updatedAt,
        };
      });

      setVehicleData(vehicleData);
    } catch (error) {
      setVehicleData([]);
    } finally {
      setLoading(false);
    }
  };
  //open add vehicle modal
  const handleAdd = async () => {
    // Reset form data when opening fresh
    setVehicleFormData({
      plateNo: "",
      fileNo: "",
      engineNo: "",
      chassisNo: "",
      make: "",
      bodyType: "",
      color: "",
      classification: undefined,
      dateOfRenewal: undefined,
      vehicleStatusType: "",
      driver: "",
    });
    setAddVehicleModalOpen(true);
    setAddOwnerModalOpen(false);
  };
  
  // Handle "Add New Owner" button click from Add Vehicle modal
  // This closes Add Vehicle modal and opens Add Owner modal
  const handleAddNewOwner = () => {
    setAddVehicleModalOpen(false);
    setAddOwnerModalOpen(true);
  };
  
  // Handle cancel from Add Owner modal - return to Add Vehicle modal
  const handleOwnerModalCancel = () => {
    setAddOwnerModalOpen(false);
    setAddVehicleModalOpen(true);
  };
  
  // Handle successful owner creation - return to Add Vehicle modal with new owner selected
  const handleOwnerCreated = (newOwner) => {
    // Update vehicle form data with the newly created owner
    setVehicleFormData(prev => ({
      ...prev,
      driver: newOwner._id || newOwner.id || "",
    }));
    
    // Close Add Owner modal and reopen Add Vehicle modal
    setAddOwnerModalOpen(false);
    setAddVehicleModalOpen(true);
  };
  
  // Handle "Add New Owner" from Edit Vehicle modal
  const handleEditAddNewOwner = () => {
    setEditVehicleModalOpen(false);
    setEditOwnerModalOpen(true);
  };
  
  // Handle cancel from Add Owner modal when editing - return to Edit Vehicle modal
  const handleEditOwnerModalCancel = () => {
    setEditOwnerModalOpen(false);
    setEditVehicleModalOpen(true);
  };
  
  // Handle successful owner creation during edit - return to Edit Vehicle modal with new owner selected
  const handleEditOwnerCreated = (newOwner) => {
    // Update edit vehicle form data with the newly created owner
    setEditVehicleFormData(prev => ({
      ...prev,
      driver: newOwner._id || newOwner.id || "",
    }));
    
    // Close Edit Owner modal and reopen Edit Vehicle modal
    setEditOwnerModalOpen(false);
    setEditVehicleModalOpen(true);
  };

  //open vehicle details modal
  const onRowClick = (data) => {
    setSelectedVehicle(data);
    setDetailsModalOpen(true);
    // Close other modals when opening details
    setAddVehicleModalOpen(false);
    setEditVehicleModalOpen(false);
    setAddOwnerModalOpen(false);
    setEditOwnerModalOpen(false);
    setEditOpenedFromDetails(false); // Reset flag when opening details
  };

  const onEdit = (vehicleId) => {
    setEditingVehicleId(vehicleId);
    // Only reset edit form data if we're not returning from Add Owner modal
    // (If returning from Add Owner, editVehicleFormData will have the preserved data)
    if (!editOwnerModalOpen) {
      setEditVehicleFormData({
        plateNo: "",
        fileNo: "",
        engineNo: "",
        chassisNo: "",
        make: "",
        bodyType: "",
        color: "",
        classification: undefined,
        dateOfRenewal: undefined,
        vehicleStatusType: "",
        driver: "",
      });
    }
    setEditVehicleModalOpen(true);
    setEditOpenedFromDetails(false); // Edit opened from table, not from details modal
    // Close other modals when opening edit
    setDetailsModalOpen(false);
    setAddVehicleModalOpen(false);
    setAddOwnerModalOpen(false);
  };

  const onRenew = (vehicle) => {
    setRenewingVehicle(vehicle);
    setTableRenewalModalOpen(true);
  };

  const handleRenewal = () => {
    setRenewalModalOpen(true);
  };

  const handleVehicleUpdated = () => {
    // Refresh the vehicle list when a vehicle is updated through renewal modal
    fetchVehicles();
  };

  const handleVehicleAdded = () => {
    // Refresh the vehicle list when a new vehicle is added
    fetchVehicles();
  };

  const handleDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;
    
    try {
      await apiClient.delete(`/vehicle/${vehicleToDelete._id}`, {
        headers: {
          Authorization: token,
        },
      });
      toast.success("Vehicle moved to bin successfully");
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete vehicle");
    } finally {
      setShowDeleteAlert(false);
      setVehicleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteAlert(false);
    setVehicleToDelete(null);
  };

  const handleBinClick = () => {
    navigate("/vehicle/bin");
  };



  return (
    <div className="h-full flex flex-col overflow-hidden rounded-lg">
      <div className="bg-white dark:bg-transparent rounded-lg shadow-sm border border-gray-200 dark:border-0 px-4 md:px-6 pt-4 md:pt-6 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 flex-shrink-0">Vehicles</header>
        <div className="flex-1 flex flex-col min-h-0">
          {/* Call vehicle table component */}
          <VehiclesTable
            data={vehicleData}
            filters={["plateNo", "fileNo", "engineNo", "chassisNo", "classification", "status"]}
            tableColumn={vehicleColumns}
            onAdd={handleAdd}
            loading={loading}
            onRowClick={onRowClick}
            onEdit={onEdit}
            onRenew={onRenew}
            onDelete={userData?.role === "2" ? null : handleDelete}
            onBinClick={userData?.role === "2" ? null : handleBinClick}
            showExport={userData?.role !== "2"}
            submitting={submitting}
          />
        </div>
      </div>

      {/* Renewal Modal */}
      <VehicleRenewalModal 
        open={renewalModalOpen} 
        onOpenChange={setRenewalModalOpen}
        onVehicleUpdated={handleVehicleUpdated}
      />

      {/* Table Renewal Modal */}
      <VehicleRenewalModal 
        open={tableRenewalModalOpen} 
        onOpenChange={setTableRenewalModalOpen}
        vehicleData={renewingVehicle}
        onVehicleUpdated={handleVehicleUpdated}
      />

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        open={addVehicleModalOpen}
        onOpenChange={setAddVehicleModalOpen}
        onVehicleAdded={handleVehicleAdded}
        onAddNewOwner={handleAddNewOwner}
        formData={vehicleFormData}
        setFormData={setVehicleFormData}
      />
      
      {/* Add Owner Modal - controlled at page level (for Add Vehicle flow) */}
      <AddDriverModal
        open={addOwnerModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            // If closing, return to Add Vehicle modal
            handleOwnerModalCancel();
          } else {
            setAddOwnerModalOpen(isOpen);
          }
        }}
        onDriverAdded={handleOwnerCreated}
        onCancel={handleOwnerModalCancel}
      />
      
      {/* Add Owner Modal - controlled at page level (for Edit Vehicle flow) */}
      <AddDriverModal
        open={editOwnerModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            // If closing, return to Edit Vehicle modal
            handleEditOwnerModalCancel();
          } else {
            setEditOwnerModalOpen(isOpen);
          }
        }}
        onDriverAdded={handleEditOwnerCreated}
        onCancel={handleEditOwnerModalCancel}
      />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={detailsModalOpen}
        onOpenChange={(isOpen) => {
          setDetailsModalOpen(isOpen);
          // Close other modals when closing details
          if (!isOpen) {
            setEditVehicleModalOpen(false);
            setAddVehicleModalOpen(false);
            setAddOwnerModalOpen(false);
            setEditOwnerModalOpen(false);
            // Only clear selectedVehicle if edit was NOT opened from details
            // (If edit was opened from details, we need selectedVehicle to reopen details on cancel)
            // Use setTimeout to check after state updates have been processed
            setTimeout(() => {
              if (!editOpenedFromDetails) {
                setSelectedVehicle(null);
              }
            }, 0);
          }
        }}
        vehicleData={selectedVehicle}
        onVehicleUpdated={handleVehicleUpdated}
        onEditClick={(vehicleId) => {
          // Mark that edit was opened from details modal BEFORE closing details
          setEditOpenedFromDetails(true);
          // Close details modal and open edit modal
          setDetailsModalOpen(false);
          // Reset edit form data when opening from details modal
          setEditVehicleFormData({
            plateNo: "",
            fileNo: "",
            engineNo: "",
            chassisNo: "",
            make: "",
            bodyType: "",
            color: "",
            classification: undefined,
            dateOfRenewal: undefined,
            vehicleStatusType: "",
            driver: "",
          });
          setEditingVehicleId(vehicleId);
          setEditVehicleModalOpen(true);
        }}
      />

      {/* Edit Vehicle Modal */}
      <EditVehicleModal
        open={editVehicleModalOpen}
        onOpenChange={(isOpen) => {
          setEditVehicleModalOpen(isOpen);
          // Close other modals when closing edit (unless canceling to return to details)
          if (!isOpen) {
            // Only close details modal if we're not canceling to return to it
            // The onCancel callback will handle reopening details modal
            if (!detailsModalOpen) {
              setAddVehicleModalOpen(false);
              setAddOwnerModalOpen(false);
              setEditOwnerModalOpen(false);
            }
          }
        }}
        vehicleId={editingVehicleId}
        onVehicleUpdated={handleVehicleUpdated}
        onAddNewOwner={handleEditAddNewOwner}
        formData={editVehicleFormData}
        setFormData={setEditVehicleFormData}
        onCancel={() => {
          // Close edit modal
          setEditVehicleModalOpen(false);
          // Only reopen details modal if edit was opened FROM details modal
          if (editOpenedFromDetails && selectedVehicle) {
            setDetailsModalOpen(true);
          } else {
            // If edit was NOT opened from details, clear selectedVehicle
            setSelectedVehicle(null);
          }
          // Reset flag after canceling
          setEditOpenedFromDetails(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDIalog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        confirm={confirmDelete}
        cancel={cancelDelete}
        title="Do you want to delete this?"
        description="This action will move the vehicle to bin. You can restore it later from the bin."
      />
    </div>
  );
};

export default VehiclesPage;