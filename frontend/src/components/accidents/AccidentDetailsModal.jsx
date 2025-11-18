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
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Car, 
  Hash, 
  FileText,
  Edit,
  User,
  Clock
} from "lucide-react";
import { formatSimpleDate } from "@/util/dateFormatter";

const AccidentDetailsModal = ({ open, onOpenChange, accidentData, onEditClick }) => {

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

  const formatUserName = (user) => {
    if (!user) return "Unknown";
    const { firstName, middleName, lastName } = user;
    return `${firstName || ''} ${middleName || ''} ${lastName || ''}`.trim() || "Unknown";
  };

  const getCaseStatusBadge = (caseStatus) => {
    let badgeColor, icon;
    
    switch (caseStatus?.toLowerCase()) {
      case 'pending':
        badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        icon = <Clock className="h-3 w-3" />;
        break;
      case 'ongoing':
        badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        icon = <AlertTriangle className="h-3 w-3" />;
        break;
      case 'solved':
        badgeColor = 'bg-green-100 text-green-800 border-green-200';
        icon = <AlertTriangle className="h-3 w-3" />;
        break;
      case 'closed':
        badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
        icon = <AlertTriangle className="h-3 w-3" />;
        break;
      default:
        badgeColor = 'bg-gray-100 text-gray-800 border-gray-200';
        icon = <AlertTriangle className="h-3 w-3" />;
    }
    
    return (
      <Badge variant="outline" className={`text-xs font-medium ${badgeColor}`}>
        <div className="flex items-center gap-1">
          {icon}
          {caseStatus?.charAt(0).toUpperCase() + caseStatus?.slice(1) || "N/A"}
        </div>
      </Badge>
    );
  };

  const AccidentDetailsTab = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Blotter No.
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData?.blotterNo || "N/A"}</p>
        </div>
        {accidentData?.vehiclePlateNo && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Vehicle Plate No.
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.vehiclePlateNo}</p>
          </div>
        )}
        {accidentData?.vehicleMCPlateNo && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Vehicle MC Plate No.
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.vehicleMCPlateNo}</p>
          </div>
        )}
        {accidentData?.vehicleChassisNo && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Vehicle Chassis No.
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.vehicleChassisNo}</p>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <User className="h-3 w-3" />
            Suspect
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData?.suspect || "N/A"}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Incident Type
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData?.incidentType || "N/A"}</p>
        </div>
        
        {/* Case Information */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Case Status
          </label>
          <div className="ml-4">
            {getCaseStatusBadge(accidentData?.caseStatus)}
          </div>
        </div>
        {accidentData?.offense && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Offense
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.offense}</p>
          </div>
        )}
        {accidentData?.offenseType && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Offense Type
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.offenseType}</p>
          </div>
        )}
        {accidentData?.stageOfFelony && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Stage of Felony
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.stageOfFelony}</p>
          </div>
        )}
        
        {/* Location Information */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 md:col-span-2">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Location
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">
            {[
              accidentData?.street,
              accidentData?.barangay,
              accidentData?.municipality,
              accidentData?.province,
              accidentData?.region
            ].filter(Boolean).join(", ") || "N/A"}
          </p>
        </div>
        
        {/* Date Information */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Date Committed
          </label>
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">
            {accidentData?.dateCommited || "N/A"}
            {accidentData?.timeCommited && ` at ${accidentData.timeCommited}`}
          </p>
        </div>
        {accidentData?.dateReported && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date Reported
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">
              {formatDate(accidentData.dateReported)}
              {accidentData?.timeReported && ` at ${accidentData.timeReported}`}
            </p>
          </div>
        )}

        {/* Narrative */}
        {accidentData?.narrative && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 md:col-span-2">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Narrative
            </label>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 ml-4">{accidentData.narrative}</p>
          </div>
        )}

        {/* Created/Updated metadata */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" />
              Created By
            </label>
            <div className="ml-4 flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatUserName(accidentData?.createdBy)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="text-gray-500 dark:text-gray-400">{formatDateTime(accidentData?.createdAt)}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Edit className="h-3 w-3" />
              Updated By
            </label>
            <div className="ml-4 flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatUserName(accidentData?.updatedBy || accidentData?.createdBy)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">•</span>
              <span className="text-gray-500 dark:text-gray-400">
                {formatDateTime(accidentData?.updatedAt || accidentData?.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: "accident", label: "Accident Details", icon: FileText },
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
              <DialogTitle className="text-lg font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                Incident Details
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive incident information including case details, location, and status
              </DialogDescription>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                <Hash className="h-3 w-3 text-red-500" />
                Blotter No: <span className="font-semibold text-red-600">{accidentData?.blotterNo || "N/A"}</span>
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
                    className="flex-1 flex items-center gap-1 text-xs font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-red-400 text-white shadow-lg"
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Tab Content */}
          <div className="flex-1 overflow-y-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-red-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-red-500">
            <AccidentDetailsTab />
          </div>

           {/* Footer with Edit Button */}
           <div className="flex-shrink-0 pt-4 border-t border-gray-200 dark:border-gray-700">
             <div className="flex items-center justify-end">
               <Button
                 onClick={() => {
                   // Close details modal and trigger edit via parent callback
                   if (onEditClick && accidentData?._id) {
                     onEditClick(accidentData._id);
                   }
                 }}
                 className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 text-sm font-semibold"
               >
                 <Edit className="h-4 w-4 mr-2" />
                 Edit Accident
               </Button>
             </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccidentDetailsModal;
