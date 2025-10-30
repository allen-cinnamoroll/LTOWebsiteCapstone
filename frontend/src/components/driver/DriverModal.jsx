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
import { Edit, User, MapPin, Phone, Mail, Calendar, Car, FileText, CreditCard } from "lucide-react";
import { toast } from "sonner";
import EditDriverModal from "./EditDriverModal";

const DriverModal = ({ open, onOpenChange, driverData, onFileNumberClick, onDriverUpdated }) => {
  const params = useParams();
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { token } = auth || {};


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
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden bg-white">
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

          {/* Content - No Scroll */}
          <div className="p-6 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Personal Information</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">File Numbers</p>
                    </div>
                    <div className="ml-6 mt-1">
                      {driverData.vehicleIds && driverData.vehicleIds.length > 0 ? (
                        <div className="space-y-2">
                          {driverData.vehicleIds.map((vehicle, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <button
                                onClick={() => handleFileNumberClick(vehicle.fileNo)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium cursor-pointer hover:underline text-left break-all bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors duration-200"
                                title={`Click to view vehicle details for ${vehicle.fileNo}`}
                              >
                                {vehicle.fileNo}
                              </button>
                              {vehicle.plateNo && (
                                <span className="text-xs text-gray-500">
                                  ({vehicle.plateNo})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Owner/Representative</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">{driverData.ownerRepresentativeName || "N/A"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Date of Birth</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">
                      {driverData.birthDate ? formatSimpleDate(driverData.birthDate) : "None"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Contact Number</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">{driverData.contactNumber || "None"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Email Address</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1 truncate">{driverData.emailAddress || "None"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Driver's License</p>
                    </div>
                    <div className="flex items-center gap-2 ml-6 mt-1">
                      <Badge variant={driverData.hasDriversLicense ? "default" : "destructive"} className="text-xs px-2 py-0.5">
                        {driverData.hasDriversLicense ? "Yes" : "No"}
                      </Badge>
                      {driverData.hasDriversLicense && driverData.driversLicenseNumber && (
                        <span className="text-xs text-gray-600">
                          {driverData.driversLicenseNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Address Information</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Purok</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">{driverData.address?.purok || "N/A"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Barangay</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">{driverData.address?.barangay || "N/A"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Municipality</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">{driverData.address?.municipality || "N/A"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-500">Province</p>
                    </div>
                    <p className="text-xs font-medium text-gray-800 ml-6 mt-1">{driverData.address?.province || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-white px-6 py-3">
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

