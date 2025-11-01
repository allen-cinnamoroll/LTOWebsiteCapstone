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
import { CheckCircle2Icon, CircleAlert, Calendar, User, Car, RefreshCw, Hash, Wrench, FileText, Calendar as CalendarIcon, Tag, Palette, Building, Clock, Shield, Phone, Mail, MapPin, CreditCard, UserCheck, AlertCircle, Loader2, Edit } from "lucide-react";
import EditVehicleModal from "./EditVehicleModal";
import VehicleRenewalModal from "./VehicleRenewalModal";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const VehicleDetailsModal = ({ open, onOpenChange, vehicleData, onVehicleUpdated }) => {
  const [activeTab, setActiveTab] = useState("vehicle");
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalError, setRenewalError] = useState(null);
  const [userNameCache, setUserNameCache] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    // DEBUG: Log vehicle data to check metadata fields
    if (open && vehicleData) {
      console.log('=== VEHICLE DETAILS MODAL DEBUG ===');
      console.log('Full vehicleData:', vehicleData);
      console.log('createdBy:', vehicleData.createdBy);
      console.log('createdBy type:', typeof vehicleData.createdBy);
      console.log('createdAt:', vehicleData.createdAt);
      console.log('updatedBy:', vehicleData.updatedBy);
      console.log('updatedBy type:', typeof vehicleData.updatedBy);
      console.log('updatedAt:', vehicleData.updatedAt);
      console.log('=== END DEBUG ===');
    }
    
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

  // Prefetch names for createdBy / updatedBy so they render nicely in Vehicle tab
  useEffect(() => {
    if (!open || !vehicleData) return;
    const ids = [vehicleData.createdBy, vehicleData.updatedBy]
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
  }, [open, vehicleData]);

  const buildFullName = (user) => {
    if (!user) return '';
    // Handle different formats: full user object, or { _id, name } format
    if (user.name) {
      return user.name; // Handle the transformed format from getVehicle endpoint
    }
    const full = user.fullname || `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.replace(/\s+/g, ' ').trim();
    return full;
  };

  // Determine scheduled month from plate last digit
  const getScheduledMonthFromPlate = (plateNo) => {
    if (!plateNo || typeof plateNo !== 'string') return null;
    const digits = plateNo.match(/\d/g) || [];
    if (!digits.length) return null;
    const lastDigit = digits[digits.length - 1];
    const map = {
      '1': 0, // January
      '2': 1, // February
      '3': 2, // March
      '4': 3, // April
      '5': 4, // May
      '6': 5, // June
      '7': 6, // July
      '8': 7, // August
      '9': 8, // September
      '0': 9  // October
    };
    return map[lastDigit] ?? null;
  };

  const determineRenewalStatus = (plateNo, renewalDate) => {
    try {
      const scheduledMonth = getScheduledMonthFromPlate(plateNo);
      if (scheduledMonth === null) return 'On-Time Renewal';
      const month = new Date(renewalDate).getMonth();
      if (month === scheduledMonth) return 'On-Time Renewal';
      if (month < scheduledMonth) return 'Early Renewal';
      return 'Late Renewal';
    } catch {
      return 'On-Time Renewal';
    }
  };

  const fetchRenewalHistory = async () => {
    // Derive renewal history locally from vehicleData.dateOfRenewal
    if (!vehicleData) return;
    setRenewalLoading(true);
    setRenewalError(null);
    try {
      const dates = vehicleData.dateOfRenewal;
      const dateArray = Array.isArray(dates) ? dates : (dates ? [dates] : []);
      const history = dateArray
        .map((entry) => ({
          renewalDate: entry?.date || entry,
          processedBy: entry?.processedBy || null,
          status: determineRenewalStatus(vehicleData.plateNo, entry?.date || entry)
        }))
        .sort((a, b) => new Date(b.renewalDate) - new Date(a.renewalDate));
      setRenewalHistory(history);
      // Resolve processedBy names
      const ids = Array.from(new Set(
        history
          .map(h => (typeof h.processedBy === 'string' ? h.processedBy : (h.processedBy?._id || null)))
          .filter(Boolean)
      ));
      const unknownIds = ids.filter(id => !(id in userNameCache));
      if (unknownIds.length) {
        const results = await Promise.allSettled(
          unknownIds.map(async (id) => {
            try {
              const { data } = await apiClient.get(`/user/${id}`, { headers: { Authorization: token } });
              const user = data?.data || {};
              const fullName = user.fullname || `${user.firstName || ''} ${user.lastName || ''}`.trim() || id;
              return { id, name: fullName };
            } catch (e) {
              return { id, name: id };
            }
          })
        );
        const newMap = { ...userNameCache };
        results.forEach(r => { if (r.status === 'fulfilled') newMap[r.value.id] = r.value.name; });
        setUserNameCache(newMap);
      }
    } catch (e) {
      console.error('Error deriving renewal history from vehicle data:', e);
      setRenewalError('Failed to derive renewal history');
    } finally {
      setRenewalLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return String(dateString);
    }
  };

  // Get latest valid renewal date from array/single/object entries
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
        {/* Vehicle Status Type moved next to Status */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Vehicle Status Type
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{vehicleData?.vehicleStatusType || "N/A"}</p>
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
      </div>
      {/* Creator / Updater info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            Created By
          </label>
          <div className="ml-4 flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {(() => {
                const u = vehicleData?.createdBy;
                if (!u) return 'Unknown';
                if (typeof u === 'object') return buildFullName(u) || 'Unknown';
                return userNameCache[u] || u;
              })()}
            </span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-500 dark:text-gray-400">
              {vehicleData?.createdAt ? formatDate(vehicleData.createdAt) : 'Unknown'}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Edit className="h-3 w-3" />
            Last Updated By
          </label>
          <div className="ml-4 flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {(() => {
                const u = vehicleData?.updatedBy;
                if (!u) return 'Not yet updated';
                if (typeof u === 'object') return buildFullName(u) || 'Not yet updated';
                return userNameCache[u] || u;
              })()}
            </span>
            <span className="text-gray-500 dark:text-gray-400">•</span>
            <span className="text-gray-500 dark:text-gray-400">
              {vehicleData?.updatedAt && vehicleData?.updatedBy ? formatDate(vehicleData.updatedAt) : 'Not yet updated'}
            </span>
          </div>
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  Yes
                </Badge>
                {ownerData?.driversLicenseNumber && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {ownerData.driversLicenseNumber}
                  </span>
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
            {(() => {
              const count = renewalHistory.length || 0;
              const label = count === 1 ? "record" : "records";
              const plate = vehicleData?.plateNo || "N/A";
              return (
                <>
                  {`Renewal History (${count} ${label}) • Plate: `}
                  <span className="font-normal">{plate}</span>
                </>
              );
            })()}
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
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                <TableHead className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                  Processed By
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renewalHistory.map((record, index) => (
                <TableRow key={record._id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="text-xs text-gray-900 dark:text-gray-100 text-center">
                    {formatDate(record.renewalDate)}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    <div className="flex justify-center">
                      {getRenewalStatusBadge(record.status)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    {(() => {
                      if (!record.processedBy) return "System";
                      if (typeof record.processedBy === 'object') {
                        return record.processedBy.fullname || `${record.processedBy.firstName || ''} ${record.processedBy.lastName || ''}`.trim() || 'System';
                      }
                      const id = record.processedBy;
                      return userNameCache[id] || id;
                    })()}
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl h-[80vh] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col"
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

        {/* Footer actions */}
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit Vehicle
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setRenewOpen(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Renew Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {/* Action Modals */}
    <EditVehicleModal
      open={editOpen}
      onOpenChange={setEditOpen}
      vehicleId={vehicleData?._id}
      onVehicleUpdated={onVehicleUpdated}
    />
    <VehicleRenewalModal
      open={renewOpen}
      onOpenChange={setRenewOpen}
      vehicleData={vehicleData}
      onVehicleUpdated={onVehicleUpdated}
    />
    </>
  );
};

export default VehicleDetailsModal;


