import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatSimpleDate } from "@/util/dateFormatter";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Edit, User, MapPin, Phone, Mail, Calendar, Car, FileText, CreditCard, List, UserCheck } from "lucide-react";
import { toast } from "sonner";
import EditDriverModal from "./EditDriverModal";

const DriverModal = ({ open, onOpenChange, driverData, onFileNumberClick, onDriverUpdated }) => {
  const params = useParams();
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [userNameCache, setUserNameCache] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { token } = auth || {};

  // Prefetch names for createdBy / updatedBy
  useEffect(() => {
    if (!open || !driverData) return;
    const ids = [driverData.createdBy, driverData.updatedBy]
      .map(u => (typeof u === 'object' ? u?._id : u))
      .filter(Boolean);
    const unknownIds = ids.filter(id => !(id in userNameCache));
    if (!unknownIds.length) return;
    (async () => {
      try {
        const results = await Promise.allSettled(
          unknownIds.map(async (id) => {
            try {
              const { data } = await apiClient.get(`/user/${id}`, { headers: { Authorization: token } });
              const user = data?.data || {};
              const fullName = user.fullname || `${user.firstName || ''} ${user.lastName || ''}`.trim() || id;
              return { id, name: fullName };
            } catch {
              return { id, name: id };
            }
          })
        );
        const newMap = { ...userNameCache };
        results.forEach(r => { if (r.status === 'fulfilled') newMap[r.value.id] = r.value.name; });
        setUserNameCache(newMap);
      } catch {}
    })();
  }, [open, driverData]);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return String(dateString);
    }
  };

  const displayOrNotIndicated = (val) => {
    if (val == null) return 'Not indicated';
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return 'Not indicated';
      if (trimmed.toLowerCase() === 'none') return 'Not indicated';
      return trimmed;
    }
    return val;
  };

  const handleFileNumberClick = async (fileNo) => {
    if (!fileNo) return;
    
    if (onFileNumberClick) {
      onFileNumberClick(fileNo);
    } else {
      // Fallback to the original behavior if no external handler is provided
      setLoadingVehicle(true);
      setVehicleModalOpen(true);
      
      try {
        const { data } = await apiClient.get(`/vehicle/file/${fileNo}`, {
          headers: {
            Authorization: token,
          },
        });
        
        if (data.success) {
          setVehicleData(data.data);
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
        toast.error("Failed to fetch vehicle information");
      } finally {
        setLoadingVehicle(false);
      }
    }
  };

  // Normalize renewal entries and get the latest valid date
  const getLatestRenewalDate = (dates) => {
    if (!dates) return null;
    const toDate = (val) => {
      const raw = (val && typeof val === 'object' && 'date' in val) ? val.date : val;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };
    const arr = Array.isArray(dates) ? dates : [dates];
    const valid = arr.map(toDate).filter(Boolean).sort((a, b) => b.getTime() - a.getTime());
    return valid.length ? valid[0] : null;
  };

  if (!driverData) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl w-full p-0 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {driverData.ownerRepresentativeName?.charAt(0) || "D"}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{driverData.ownerRepresentativeName}</h2>
                <p className="text-xs text-gray-600">Driver Profile</p>
              </div>
            </div>
          </div>

          {/* Content: non-scroll for Personal, scroll for Assigned Vehicles */}
          <div className={`p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg m-4 mt-2 flex-1 min-h-[56vh] ${activeTab === 'vehicles' ? 'overflow-y-auto max-h-[50vh]' : 'overflow-visible'}`}>
            {/* Tab Navigation */}
            <div className="flex mb-4">
              <div className="flex-1 flex space-x-1 bg-white/80 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setActiveTab("personal")}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium px-3 py-2 rounded-md transition-all duration-200 ${
                    activeTab === "personal"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span>Personal Information</span>
                </button>
                <button
                  onClick={() => setActiveTab("vehicles")}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium px-3 py-2 rounded-md transition-all duration-200 ${
                    activeTab === "vehicles"
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <List className="h-3 w-3" />
                  <span>Assigned Vehicles</span>
                </button>
              </div>
            </div>

            {activeTab === "personal" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
              {/* Personal Information */}
              <div className="space-y-2">
                {/* No. of Vehicles */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Car className="h-3 w-3" />
                    No. of Vehicles
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">
                    {Array.isArray(driverData.vehicleIds) ? driverData.vehicleIds.length : 0}
                  </p>
                </div>

                {/* Owner/Representative */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Owner
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{driverData.ownerRepresentativeName || "N/A"}</p>
                </div>

                {/* Date of Birth */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date of Birth
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{driverData.birthDate ? formatSimpleDate(driverData.birthDate) : "None"}</p>
                </div>

                {/* Contact Number */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Contact Number
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{driverData.contactNumber || "None"}</p>
                </div>

                {/* Email */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email Address
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4 truncate">{driverData.emailAddress || "None"}</p>
                </div>

                {/* Created By */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Created By
                  </label>
                  <div className="ml-4 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-900">
                      {(() => {
                        const u = driverData?.createdBy;
                        if (!u) return 'Unknown';
                        if (typeof u === 'object') return u.fullname || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
                        return userNameCache[u] || u;
                      })()}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{formatDisplayDate(driverData?.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-2">
                {/* License placed to the right of Email */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Driver's License
                  </label>
                  <div className="ml-4 flex items-center gap-2">
                    <span className={`text-xs font-semibold ${driverData.hasDriversLicense ? 'text-blue-600' : 'text-red-600'}`}>
                      {driverData.hasDriversLicense ? 'Yes' : 'No'}
                    </span>
                    {driverData.hasDriversLicense && driverData.driversLicenseNumber && (
                      <span className="text-xs font-semibold text-gray-900">{driverData.driversLicenseNumber}</span>
                    )}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Purok
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{displayOrNotIndicated(driverData.address?.purok)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Barangay
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{displayOrNotIndicated(driverData.address?.barangay)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Municipality
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{displayOrNotIndicated(driverData.address?.municipality)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Province
                  </label>
                  <p className="text-xs font-semibold text-gray-900 ml-4">{displayOrNotIndicated(driverData.address?.province)}</p>
                </div>

                {/* Last Updated By */}
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Edit className="h-3 w-3" />
                    Last Updated By
                  </label>
                  <div className="ml-4 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-900">
                      {(() => {
                        const u = driverData?.updatedBy;
                        if (!u) return 'Not yet updated';
                        if (typeof u === 'object') return u.fullname || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Not yet updated';
                        return userNameCache[u] || u;
                      })()}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{driverData?.updatedAt && driverData?.updatedBy ? formatDisplayDate(driverData.updatedAt) : 'Not yet updated'}</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === "vehicles" && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[50vh] pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Assigned Vehicles</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {driverData.vehicleIds && driverData.vehicleIds.length > 0 ? (
                    driverData.vehicleIds.map((vehicle, index) => (
                      <div key={index} className="bg-white p-2 rounded-lg border border-gray-200 hover:border-blue-300 shadow-sm">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1">
                          <FileText className="h-3 w-3" /> File Number
                        </div>
                        <button
                          onClick={() => handleFileNumberClick(vehicle.fileNo)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline break-all mt-0.5"
                          title={`View vehicle details for ${vehicle.fileNo}`}
                        >
                          {vehicle.fileNo}
                        </button>
                        {vehicle.plateNo && (
                          <div className="text-xs text-gray-500">Plate: {vehicle.plateNo}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">No vehicles assigned.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="flex-shrink-0 border-t bg-white px-6 py-3">
            <div className="flex justify-end">
              <Button
                onClick={() => setEditModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md font-medium text-xs shadow-sm transition-colors duration-200"
              >
                <Edit className="h-3 w-3 mr-1.5" />
                Edit Driver
              </Button>
            </div>
          </div>

          
        </DialogContent>
      </Dialog>

      {/* Edit Driver Modal */}
      <EditDriverModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        driverData={driverData}
        onDriverUpdated={onDriverUpdated}
      />

      {/* Vehicle Modal */}
      <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicle Information
            </DialogTitle>
            <DialogDescription>
              Vehicle details for file number: {driverData?.fileNo}
            </DialogDescription>
          </DialogHeader>

          {loadingVehicle ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : vehicleData ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600">Plate Number</p>
                        <p className="font-medium text-sm">{vehicleData.plateNo || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">File Number</p>
                        <p className="font-medium text-sm">{vehicleData.fileNo || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Engine Number</p>
                        <p className="font-medium text-sm">{vehicleData.engineNo || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Chassis Number</p>
                        <p className="font-medium text-sm">{vehicleData.chassisNo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600">Make</p>
                        <p className="font-medium text-sm">{vehicleData.make || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Body Type</p>
                        <p className="font-medium text-sm">{vehicleData.bodyType || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Color</p>
                        <p className="font-medium text-sm">{vehicleData.color || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Classification</p>
                        <p className="font-medium text-sm">{vehicleData.classification || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Date of Renewal</p>
                      <p className="font-medium text-sm">
                        {(() => {
                          const latest = getLatestRenewalDate(vehicleData.dateOfRenewal);
                          return latest ? latest.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <Badge variant={vehicleData.status === "Active" ? "default" : "destructive"}>
                        {vehicleData.status || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No vehicle information found for this file number.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default DriverModal;

