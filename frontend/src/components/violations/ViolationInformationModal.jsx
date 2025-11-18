import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Hash, 
  List,
  X
} from "lucide-react";

const ViolationInformationModal = ({ open, onOpenChange, violationData, allViolations = [] }) => {
  const [violatorViolations, setViolatorViolations] = useState([]);

  useEffect(() => {
    if (open && violationData) {
      // Find all violations for this violator
      findViolatorViolations();
    }
  }, [open, violationData, allViolations]);

  const findViolatorViolations = () => {
    if (!violationData || allViolations.length === 0) {
      setViolatorViolations([]);
      return;
    }

    // Match violations by firstName, lastName, middleInitial, and suffix
    const matchingViolations = allViolations.filter(v => {
      const sameFirstName = (v.firstName || "N/A") === (violationData.firstName || "N/A");
      const sameLastName = (v.lastName || "N/A") === (violationData.lastName || "N/A");
      const sameMiddleInitial = (v.middleInitial || "") === (violationData.middleInitial || "");
      const sameSuffix = (v.suffix || "") === (violationData.suffix || "");
      
      return sameFirstName && sameLastName && sameMiddleInitial && sameSuffix;
    });

    // Find the clicked violation (match by _id or topNo)
    const clickedViolationId = violationData._id;
    const clickedTopNo = violationData.topNo;

    // Sort: clicked violation first, then by date of apprehension (newest first)
    const sorted = matchingViolations.sort((a, b) => {
      // Put the clicked violation first
      const aIsClicked = a._id === clickedViolationId || a.topNo === clickedTopNo;
      const bIsClicked = b._id === clickedViolationId || b.topNo === clickedTopNo;
      
      if (aIsClicked && !bIsClicked) return -1;
      if (!aIsClicked && bIsClicked) return 1;
      
      // If neither or both are clicked, sort by date (newest first)
      const dateA = a.dateOfApprehension ? new Date(a.dateOfApprehension) : new Date(0);
      const dateB = b.dateOfApprehension ? new Date(b.dateOfApprehension) : new Date(0);
      return dateB - dateA;
    });

    setViolatorViolations(sorted);
  };

  const handleTopNumberClick = (violation) => {
    // Close this modal
    onOpenChange(false);
    // Trigger event to open ViolationDetailsModal with flag to reopen this modal
    window.dispatchEvent(new CustomEvent('openViolationDetails', { 
      detail: {
        violation: violation,
        reopenInformationModal: true
      }
    }));
  };

  if (!violationData) return null;

  // Format name: FIRSTNAME SURNAME
  const formatName = () => {
    const firstName = violationData?.firstName || "";
    const lastName = violationData?.lastName || "";
    
    if (!firstName && !lastName) return "N/A";
    
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    
    return parts.join(" ");
  };

  const fullName = formatName();
  const initials = (violationData?.firstName?.charAt(0) || violationData?.lastName?.charAt(0) || "V").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] bg-gradient-to-br from-slate-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 border-0 shadow-2xl w-full p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Violator Information</DialogTitle>
          <DialogDescription>View all violations assigned to this violator</DialogDescription>
        </DialogHeader>
        {/* Header */}
        <div className="bg-white dark:bg-transparent px-6 py-4 border-b dark:border-[#424242]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{fullName}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">Violator Assigned Violations</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-white/90 dark:bg-transparent backdrop-blur-sm border border-gray-200 dark:border-[#424242] rounded-lg m-4 mt-2 flex-1 min-h-0 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex mb-4 sticky top-0 z-10 bg-white/90 dark:bg-transparent backdrop-blur-sm pb-2 -mx-6 px-6 -mt-6 pt-6 border-b border-gray-200 dark:border-[#424242]">
            <div className="flex-1 flex space-x-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-gray-200 dark:border-[#424242]">
              <Button
                variant="ghost"
                className="flex-1 flex items-center gap-1 text-xs font-medium transition-all duration-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
              >
                <List className="h-3 w-3" />
                <span className="hidden sm:inline">Assigned Violations</span>
              </Button>
            </div>
          </div>

          {/* Assigned Violations Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Assigned Violations</h3>
            </div>
            {/* Scrollable violations container */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {violatorViolations.length > 0 ? (
                  violatorViolations.map((violation, index) => {
                    // Check if this is the clicked violation (first item should be the clicked one)
                    const isClickedViolation = index === 0 && (
                      violation._id === violationData._id || 
                      violation.topNo === violationData.topNo
                    );
                    
                    return (
                      <div 
                        key={violation._id || index} 
                        onClick={() => handleTopNumberClick(violation)}
                        className={`p-2 rounded-lg border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isClickedViolation
                            ? "bg-orange-50/50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-[#424242] hover:border-orange-300 dark:hover:border-orange-600"
                        }`}
                      >
                        <div className={`text-[10px] uppercase tracking-wide flex items-center gap-1 ${
                          isClickedViolation
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}>
                          <Hash className="h-3 w-3" /> TOP Number
                        </div>
                        <button
                          className={`text-sm font-semibold break-all mt-0.5 w-full text-left hover:underline ${
                            isClickedViolation
                              ? "text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                              : "text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                          }`}
                          title={`View violation details for ${violation.topNo}`}
                        >
                          {violation.topNo || "N/A"}
                        </button>
                        {violation.plateNo && (
                          <div className={`text-xs ${
                            isClickedViolation
                              ? "text-orange-500 dark:text-orange-500"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            Plate: {violation.plateNo}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400">No violations assigned.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViolationInformationModal;

