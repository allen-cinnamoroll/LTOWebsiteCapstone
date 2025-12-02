import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Hash, 
  User, 
  Car, 
  Tag,
  Wrench,
  FileText
} from "lucide-react";

const DriverOwnerInfoModal = ({ open, onOpenChange, violatorData }) => {
  if (!violatorData) return null;

  const formatName = () => {
    const parts = [];
    if (violatorData.firstName) parts.push(violatorData.firstName);
    if (violatorData.middleInitial) parts.push(violatorData.middleInitial);
    if (violatorData.lastName) parts.push(violatorData.lastName);
    if (violatorData.suffix) parts.push(violatorData.suffix);
    return parts.length > 0 ? parts.join(" ") : "N/A";
  };

  const formatValue = (value) => {
    if (!value || value === "null" || (typeof value === "string" && value.trim() === "")) {
      return "N/A";
    }
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-orange-500" />
            Driver Information
          </DialogTitle>
          <DialogDescription>
            View detailed information about the violator
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          <div className="space-y-4">
            {/* TOP Number */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                <Hash className="h-4 w-4 text-orange-500" />
                TOP Number
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {formatValue(violatorData.topNo)}
              </p>
            </div>

            {/* Full Name */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-orange-500" />
                Full Name
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {formatName()}
              </p>
            </div>

            {/* Plate Number */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                <Car className="h-4 w-4 text-orange-500" />
                Plate Number
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {formatValue(violatorData.plateNo)}
              </p>
            </div>

            {/* File Number */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-orange-500" />
                File Number
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {formatValue(violatorData.fileNo)}
              </p>
            </div>

            {/* Chassis Number */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-orange-500" />
                Chassis Number
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {formatValue(violatorData.chassisNo)}
              </p>
            </div>

            {/* Engine Number */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-orange-500" />
                Engine Number
              </label>
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                {formatValue(violatorData.engineNo)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverOwnerInfoModal;

