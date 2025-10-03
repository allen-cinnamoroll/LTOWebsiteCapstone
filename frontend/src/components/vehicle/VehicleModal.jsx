import React, { useState, useEffect } from "react";
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
import { Car, FileText, Wrench, Palette, Building, Calendar, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const VehicleModal = ({ open, onOpenChange, fileNumber }) => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (open && fileNumber) {
      fetchVehicleData();
    }
  }, [open, fileNumber]);

  const fetchVehicleData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/vehicle/file/${fileNumber}`, {
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
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-600" />
            Vehicle Information
          </DialogTitle>
          <DialogDescription>
            Vehicle details for file number: {fileNumber}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : vehicleData ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">File Number</p>
                        <p className="font-medium text-sm">{vehicleData.fileNo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Plate Number</p>
                        <p className="font-medium text-sm">{vehicleData.plateNo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Wrench className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Engine Number</p>
                        <p className="font-medium text-sm">{vehicleData.engineNo || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Chassis Number</p>
                        <p className="font-medium text-sm">{vehicleData.serialChassisNumber || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Make</p>
                        <p className="font-medium text-sm">{vehicleData.make || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Body Type</p>
                        <p className="font-medium text-sm">{vehicleData.bodyType || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Palette className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Color</p>
                        <p className="font-medium text-sm">{vehicleData.color || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Classification</p>
                        <p className="font-medium text-sm">{vehicleData.classification || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Date of Renewal</p>
                        <p className="font-medium text-sm">
                          {vehicleData.dateOfRenewal 
                            ? formatSimpleDate(vehicleData.dateOfRenewal) 
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-600">Vehicle Status Type</p>
                        <p className="font-medium text-sm">{vehicleData.vehicleStatusType || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {vehicleData.status === "1" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <Badge variant={vehicleData.status === "1" ? "default" : "destructive"}>
                          {vehicleData.status === "1" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No vehicle information found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VehicleModal;
