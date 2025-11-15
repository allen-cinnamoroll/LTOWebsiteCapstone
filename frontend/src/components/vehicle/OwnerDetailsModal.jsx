import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  MapPin, 
  CheckCircle2Icon, 
  CircleAlert,
  Loader2,
  AlertCircle
} from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";

const OwnerDetailsModal = ({ open, onOpenChange, ownerId }) => {
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (open && ownerId) {
      fetchOwnerData();
    }
  }, [open, ownerId]);

  const fetchOwnerData = async () => {
    if (!ownerId) {
      console.log('No ownerId found, skipping fetch');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Fetching owner data for ID: ${ownerId}`);
      const { data } = await apiClient.get(`/owner/${ownerId}`, {
        headers: {
          Authorization: token,
        },
      });
      console.log('Owner data received:', data);
      setOwnerData(data.data);
    } catch (error) {
      console.error("Error fetching owner data:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
    } finally {
      setLoading(false);
    }
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

  const OwnerInformationContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading owner information...</span>
          </div>
        </div>
      );
    }

    if (!ownerData) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load owner information</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Unable to retrieve owner details</p>
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
            <Calendar className="h-3 w-3" />
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
                Owner Information
              </DialogTitle>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive owner information including contact details, license status, and address
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <OwnerInformationContent />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerDetailsModal;
