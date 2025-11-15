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
import { 
  FileText, 
  User, 
  Calendar, 
  Shield, 
  Hash, 
  Car, 
  AlertTriangle, 
  CheckCircle2Icon, 
  CircleAlert,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  Tag,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Edit
} from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ViolationDetailsModal = ({ open, onOpenChange, violationData }) => {
  const [activeTab, setActiveTab] = useState("violation");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && violationData) {
      // Reset to first tab when modal opens
      setActiveTab("violation");
      
      // Debug: Log violation data to see what's available
      console.log("ViolationDetailsModal - violationData:", violationData);
      console.log("ViolationDetailsModal - createdAt:", violationData.createdAt);
      console.log("ViolationDetailsModal - updatedAt:", violationData.updatedAt);
    }
  }, [open, violationData]);

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getViolationTypeBadge = (type) => {
    let badgeColor, icon;
    
    switch (type) {
      case "confiscated":
        badgeColor = "bg-red-100 text-red-800 border-red-200";
        icon = <AlertTriangle className="h-3 w-3" />;
        break;
      case "impounded":
        badgeColor = "bg-orange-100 text-orange-800 border-orange-200";
        icon = <Shield className="h-3 w-3" />;
        break;
      case "alarm":
        badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
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
          {type?.charAt(0).toUpperCase() + type?.slice(1) || "Unknown"}
        </div>
      </Badge>
    );
  };

  const getLicenseTypeBadge = (licenseType) => {
    if (!licenseType) return "N/A";
    
    return (
      <Badge variant="outline" className="text-xs font-medium bg-blue-100 text-blue-800 border-blue-200">
        {licenseType}
      </Badge>
    );
  };

  const ViolationDetailsTab = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Hash className="h-3 w-3" />
            TOP Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{violationData?.topNo || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Violation Type
          </label>
          <div className="ml-4">
            {getViolationTypeBadge(violationData?.violationType)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <User className="h-3 w-3" />
            Driver Name
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">
            {violationData?.firstName && violationData?.lastName 
              ? `${violationData.firstName} ${violationData.middleInitial || ""} ${violationData.lastName} ${violationData.suffix || ""}`.trim()
              : "N/A"
            }
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Car className="h-3 w-3" />
            Plate Number
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{violationData?.plateNo || "N/A"}</p>
        </div>
        {/* Vehicle Identifiers Row: Chassis, Engine, File No. */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Chassis No.
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{(violationData?.chassisNo && violationData.chassisNo !== "null" && (typeof violationData.chassisNo !== 'string' || violationData.chassisNo.trim() !== '')) ? violationData.chassisNo : "N/A"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Engine No.
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{(violationData?.engineNo && violationData.engineNo !== "null" && (typeof violationData.engineNo !== 'string' || violationData.engineNo.trim() !== '')) ? violationData.engineNo : "N/A"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Tag className="h-3 w-3" />
              File No.
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{(violationData?.fileNo && violationData.fileNo !== "null" && (typeof violationData.fileNo !== 'string' || violationData.fileNo.trim() !== '')) ? violationData.fileNo : "N/A"}</p>
          </div>
        </div>

        {/* Then Date of Apprehension and the rest */}
        {violationData?.violationType === "confiscated" ? (
          /* For confiscated: Date, Officer, and License Type in one row */
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date of Apprehension
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{formatDate(violationData?.dateOfApprehension)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Apprehending Officer
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{violationData?.apprehendingOfficer || "N/A"}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                License Type
              </label>
              <div className="ml-4">
                {getLicenseTypeBadge(violationData?.licenseType)}
              </div>
            </div>
          </div>
        ) : (
          /* For other types: Date and Officer in separate fields, License Type below if exists */
          <>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date of Apprehension
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{formatDate(violationData?.dateOfApprehension)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Apprehending Officer
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{violationData?.apprehendingOfficer || "N/A"}</p>
            </div>
            {violationData?.licenseType && (
              <div className="md:col-span-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  License Type
                </label>
                <div className="ml-4">
                  {getLicenseTypeBadge(violationData?.licenseType)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Created/Updated metadata moved from footer */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" />
              Created By
            </label>
            <div className="ml-4 flex items-center gap-2 text-[10px] whitespace-nowrap">
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{violationData?.createdBy?.name || "Unknown"}</span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="text-gray-500 dark:text-gray-400 truncate">{formatDateTime(violationData?.createdAt)}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Edit className="h-3 w-3" />
              Updated By
            </label>
            <div className="ml-4 flex items-center gap-2 text-[10px] whitespace-nowrap">
              {(() => {
                const u = violationData?.updatedBy;
                const hasUpdatedBy = u && u.name;
                
                if (!hasUpdatedBy) {
                  return <span className="font-semibold text-gray-900 dark:text-gray-100">Not yet updated</span>;
                }
                
                return (
                  <>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {u.name}
                    </span>
                    {violationData?.updatedAt && (
                      <>
                        <span className="text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">
                          {formatDateTime(violationData.updatedAt)}
                        </span>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DriverViolationsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Driver Violations
        </h3>
      </div>
      
      {violationData?.violations && violationData.violations.length > 0 ? (
        <div className="space-y-3">
          {violationData.violations.map((violation, index) => (
            <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 leading-relaxed">
                    {violation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No violations recorded</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">This driver has no recorded violations</p>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: "violation", label: "Violation Details", icon: FileText },
    { id: "violations", label: "Owner Violations", icon: AlertTriangle },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] bg-gradient-to-br from-slate-50 to-red-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Fixed Header */}
        <DialogHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Violation Details
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive violation information including apprehension details, violations committed, and confiscated items
              </DialogDescription>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Hash className="h-3 w-3 text-red-500" />
                TOP Number: <span className="font-semibold text-red-600">{violationData?.topNo || "N/A"}</span>
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
                        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg"
                        : "text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700"
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
            {activeTab === "violation" && <ViolationDetailsTab />}
            {activeTab === "violations" && <DriverViolationsTab />}
          </div>

         {/* Footer with Edit Button */}
           <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
             <div className="flex items-center justify-end">
               <Button
                 onClick={() => {
                   onOpenChange(false);
                   // Trigger edit modal instead of navigation
                   window.dispatchEvent(new CustomEvent('editViolation', { detail: violationData?._id }));
                 }}
                 className="mt-2 sm:mt-0 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 text-sm font-semibold"
               >
                 <Edit className="h-4 w-4 mr-2" />
                 Edit Violation
               </Button>
             </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViolationDetailsModal;
