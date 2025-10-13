import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2Icon, CircleAlert, Calendar, User, Car, RefreshCw, Hash, Wrench, FileText, Calendar as CalendarIcon, Tag, Palette, Building, Clock, Shield, Phone, Mail, MapPin, CreditCard, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const VehicleDetailsModal = ({ open, onOpenChange, vehicleData }) => {
  const [activeTab, setActiveTab] = useState("vehicle");
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalError, setRenewalError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (open && vehicleData?.driverId) {
      fetchOwnerData();
    }
    if (open && vehicleData?._id) {
      fetchRenewalHistory();
    }
  }, [open, vehicleData]);

  const fetchOwnerData = async () => {
    console.log('=== FETCHING OWNER DATA ===');
    console.log('vehicleData:', vehicleData);
    console.log('driverId:', vehicleData?.driverId);
    console.log('driverId type:', typeof vehicleData?.driverId);
    console.log('driverId value:', vehicleData?.driverId);
    
    if (!vehicleData?.driverId) {
      console.log('No driverId found, skipping fetch');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Fetching driver data for ID: ${vehicleData.driverId}`);
      const { data } = await apiClient.get(`/driver/${vehicleData.driverId}`, {
        headers: {
          Authorization: token,
        },
      });
      console.log('Driver data received:', data);
      setOwnerData(data.data);
    } catch (error) {
      console.error("Error fetching owner data:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenewalHistory = async () => {
    if (!vehicleData?._id) {
      console.log('No vehicle ID found, skipping renewal history fetch');
      return;
    }

    setRenewalLoading(true);
    setRenewalError(null);
    
    try {
      console.log(`Fetching renewal history for vehicle ID: ${vehicleData._id}`);
      const { data } = await apiClient.get(`/renewal-history/vehicle/${vehicleData._id}`, {
        headers: {
          Authorization: token,
        },
      });
      
      if (data.success) {
        setRenewalHistory(data.data.history || []);
        console.log('Renewal history received:', data.data.history);
      } else {
        setRenewalError(data.message || "Failed to fetch renewal history");
      }
    } catch (error) {
      console.error("Error fetching renewal history:", error);
      const errorMessage = error.response?.data?.message || "Failed to fetch renewal history";
      setRenewalError(errorMessage);
      toast.error("Failed to load renewal history");
    } finally {
      setRenewalLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const formatBirthDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const isActive = status === "1" || status === 1;
    return (
      <div className="flex items-center gap-1">
        {isActive ? (
          <CheckCircle2Icon className="h-3 w-3 text-green-500" />
        ) : (
          <CircleAlert className="h-3 w-3 text-red-500" />
        )}
        <span className={`text-xs font-semibold ${
          isActive ? "text-green-600" : "text-red-600"
        }`}>
          {isActive ? "Active" : "Expired"}
        </span>
      </div>
    );
  };

  const getRenewalStatusBadge = (status) => {
    let badgeColor, icon;
    
    switch (status) {
      case "Early Renewal":
        badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
        icon = <Calendar className="h-3 w-3" />;
        break;
      case "On-Time Renewal":
        badgeColor = "bg-green-100 text-green-800 border-green-200";
        icon = <CheckCircle2Icon className="h-3 w-3" />;
        break;
      case "Late Renewal":
        badgeColor = "bg-red-100 text-red-800 border-red-200";
        icon = <AlertCircle className="h-3 w-3" />;
        break;
      default:
        badgeColor = "bg-gray-100 text-gray-800 border-gray-200";
        icon = <CircleAlert className="h-3 w-3" />;
    }

    return (
      <Badge variant="outline" className={`text-xs font-medium ${badgeColor}`}>
        <div className="flex items-center gap-1">
          {icon}
          {status}
        </div>
      </Badge>
    );
  };

  const VehicleInformationTab = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Plate Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.plateNo || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <FileText className="h-3 w-3" />
            File Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.fileNo || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            Engine Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.engineNo || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Chassis Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.chassisNo || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Building className="h-3 w-3" />
            Make
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.make || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Car className="h-3 w-3" />
            Body Type
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.bodyType || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Color
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.color || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Classification
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.classification || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Date of Renewal
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{formatDate(vehicleData?.dateOfRenewal)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Status
          </label>
          <div className="ml-4">
            {getStatusBadge(vehicleData?.status)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Vehicle Status Type
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.vehicleStatusType || "N/A"}</p>
        </div>
      </div>
    </div>
  );

  const OwnerInformationTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!ownerData) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">No owner information available</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <User className="h-3 w-3" />
            Owner/Representative Name
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData?.ownerRepresentativeName || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Phone className="h-3 w-3" />
            Contact Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData?.contactNumber || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Email Address
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{ownerData?.emailAddress || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Birth Date
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{formatBirthDate(ownerData?.birthDate)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            Driver's License
          </label>
          <div className="ml-4">
            {ownerData?.hasDriversLicense ? (
              <div>
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  Yes
                </Badge>
                {ownerData?.driversLicenseNumber && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    License No: {ownerData.driversLicenseNumber}
                  </p>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                No
              </Badge>
            )}
          </div>
        </div>
        {ownerData?.address && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Address
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">
              {[
                ownerData.address.barangay,
                ownerData.address.municipality,
                ownerData.address.province
              ].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  const RenewalInformationTab = () => {
    if (renewalLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading renewal history...</span>
          </div>
        </div>
      );
    }

    if (renewalError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load renewal history</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{renewalError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRenewalHistory}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    if (!renewalHistory || renewalHistory.length === 0) {
      return (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No renewal history found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Renewal records will appear here when the vehicle is renewed</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Renewal History ({renewalHistory.length} records)
          </h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRenewalHistory}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-700">
                <TableHead className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Processed By
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renewalHistory.map((record, index) => (
                <TableRow key={record._id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="text-xs text-gray-900 dark:text-gray-100">
                    {formatDate(record.renewalDate)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getRenewalStatusBadge(record.status)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                    {record.processedBy?.fullname || "System"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "vehicle", label: "Vehicle Information", icon: Car },
    { id: "owner", label: "Owner Information", icon: User },
    { id: "renewal", label: "Renewal History", icon: RefreshCw },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Fixed Header */}
        <DialogHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vehicle Details
              </DialogTitle>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive vehicle information including registration details, specifications, and current status
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-500" />
                File Number: <span className="font-semibold text-blue-600">{vehicleData?.fileNo || "N/A"}</span>
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          {/* Fixed Tab Navigation */}
          <div className="flex-shrink-0 mb-3">
            <div className="flex space-x-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center gap-1 text-xs font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                        : "text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            {activeTab === "vehicle" && <VehicleInformationTab />}
            {activeTab === "owner" && <OwnerInformationTab />}
            {activeTab === "renewal" && <RenewalInformationTab />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailsModal;
