import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, LoaderCircle, X, Eye } from "lucide-react";
import DriverOwnerInfoModal from "./DriverOwnerInfoModal";
import FormComponent from "./FormComponent";
import AddViolatorModal from "./AddViolatorModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ViolationCreateSchema } from "@/schema";
import { toast } from "sonner";
import { formatDate } from "@/util/dateFormatter";

const ViolationEntryModal = ({ open, onOpenChange, onViolationAdded, initialViolator = null }) => {
  const { token } = useAuth();

  const [allViolations, setAllViolations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [selectedViolator, setSelectedViolator] = useState(null);
  const [isViolatorEditable, setIsViolatorEditable] = useState(true);
  const [driverOwnerInfoModalOpen, setDriverOwnerInfoModalOpen] = useState(false);
  const [selectedViolatorForInfo, setSelectedViolatorForInfo] = useState(null);
  const [addViolatorModalOpen, setAddViolatorModalOpen] = useState(false);
  const [nameForNewViolator, setNameForNewViolator] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const searchInputRef = React.useRef(null);

  const violationOptions = React.useMemo(() => {
    const unique = new Set();
    allViolations.forEach((record) => {
      if (Array.isArray(record?.violations)) {
        record.violations.forEach((violationName) => {
          const normalized = (violationName || "").toString().trim();
          if (normalized.length > 0) {
            unique.add(normalized);
          }
        });
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allViolations]);

  const form = useForm({
    resolver: zodResolver(ViolationCreateSchema),
    defaultValues: {
      topNo: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      suffix: "",
      violations: [""],
      violationType: "confiscated",
      licenseType: undefined,
      plateNo: "",
      dateOfApprehension: undefined,
      apprehendingOfficer: "",
      chassisNo: "",
      engineNo: "",
      fileNo: "",
    },
  });

  // Fetch all violations when open for client-side searching
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!open) return;
        setIsSearching(true);
        const { data } = await apiClient.get("/violations", { headers: { Authorization: token } });
        if (!cancelled && data?.success) {
          setAllViolations(Array.isArray(data.data) ? data.data : []);
        }
      } catch (e) {
        if (!cancelled) setAllViolations([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, token]);

  // Initialize with initialViolator if provided
  React.useEffect(() => {
    if (open && initialViolator) {
      setSelectedViolator(initialViolator);
      setSearchTerm(formatNameFirstLast(initialViolator.firstName, initialViolator.lastName));
      setIsViolatorEditable(false);
      // Auto-populate form fields
      form.reset({
        topNo: "",
        firstName: initialViolator.firstName || "",
        middleInitial: initialViolator.middleInitial || "",
        lastName: initialViolator.lastName || "",
        suffix: initialViolator.suffix || "",
        violations: [""],
        violationType: "confiscated",
        licenseType: undefined,
        plateNo: initialViolator.plateNo || "",
        dateOfApprehension: undefined,
        apprehendingOfficer: "",
        chassisNo: initialViolator.chassisNo || "",
        engineNo: initialViolator.engineNo || "",
        fileNo: initialViolator.fileNo || "",
      });
    } else if (open && !initialViolator) {
      setSearchTerm("");
      setShowNoResults(false);
      setSelectedViolator(null);
      setIsViolatorEditable(true);
      form.reset({
        topNo: "",
        firstName: "",
        middleInitial: "",
        lastName: "",
        suffix: "",
        violations: [""],
        violationType: "confiscated",
        licenseType: undefined,
        plateNo: "",
        dateOfApprehension: undefined,
        apprehendingOfficer: "",
        chassisNo: "",
        engineNo: "",
        fileNo: "",
      });
    }
  }, [open, initialViolator, form]);

  // Debounced search with client-side filtering
  React.useEffect(() => {
    const searchViolators = () => {
      if (searchTerm.length >= 2 && isViolatorEditable) {
        setIsSearching(true);
        setShowNoResults(false);
        
        const normalized = (s) => (s || "").toString().trim().toLowerCase();
        const q = normalized(searchTerm);
        
        const results = allViolations.filter((v) => {
          const first = normalized(v.firstName);
          const last = normalized(v.lastName);
          const full1 = `${first} ${last}`.trim();
          const full2 = `${last} ${first}`.trim();
          const plate = normalized(v.plateNo);
          const top = normalized(v.topNo);
          return first.includes(q) || last.includes(q) || full1.includes(q) || full2.includes(q) || plate.includes(q) || top.includes(q);
        });
        
        setSearchResults(results);
        if (results.length === 0 && searchTerm.length >= 2) {
          setShowNoResults(true);
        } else {
          setShowNoResults(false);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowNoResults(false);
      }
    };

    const timeoutId = setTimeout(searchViolators, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, allViolations, isViolatorEditable]);

  // Auto-scroll to search section when dropdown appears
  React.useEffect(() => {
    if (searchResults.length > 0 || showNoResults) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    }
  }, [searchResults, showNoResults]);

  const formatNameFirstLast = (firstName, lastName) => {
    const f = (firstName || "").toString().trim();
    const l = (lastName || "").toString().trim();
    if (!f && !l) return "Unknown";
    if (!l) return f;
    if (!f) return l;
    return `${f} ${l}`;
  };

  const handleViolatorSelect = (violator) => {
    setSelectedViolator(violator);
    setSearchTerm(formatNameFirstLast(violator.firstName, violator.lastName));
    setSearchResults([]);
    setShowNoResults(false);
    setIsViolatorEditable(false);
    
    // Auto-populate form fields with violator data
    form.setValue("firstName", violator.firstName || "");
    form.setValue("middleInitial", violator.middleInitial || "");
    form.setValue("lastName", violator.lastName || "");
    form.setValue("suffix", violator.suffix || "");
    form.setValue("plateNo", violator.plateNo || "");
    form.setValue("chassisNo", violator.chassisNo || "");
    form.setValue("engineNo", violator.engineNo || "");
    form.setValue("fileNo", violator.fileNo || "");
  };

  const handleClearViolator = () => {
    setSelectedViolator(null);
    setSearchTerm("");
    setSearchResults([]);
    setShowNoResults(false);
    setIsViolatorEditable(true);
    // Clear name fields when violator is cleared
    form.setValue("firstName", "");
    form.setValue("middleInitial", "");
    form.setValue("lastName", "");
    form.setValue("suffix", "");
  };

  const handleAddAsNewViolator = () => {
    // Store the search term before closing modal
    setNameForNewViolator(searchTerm);
    // Close current modal and open AddViolatorModal with pre-filled name
    handleOpenChange(false);
    setAddViolatorModalOpen(true);
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      // Reset form when closing modal
      setSearchTerm("");
      setAllViolations([]);
      setSearchResults([]);
      setSelectedViolator(null);
      setIsViolatorEditable(true);
      form.reset({
        topNo: "",
        firstName: "",
        middleInitial: "",
        lastName: "",
        suffix: "",
        violations: [""],
        violationType: "confiscated",
        licenseType: undefined,
        plateNo: "",
        dateOfApprehension: undefined,
        apprehendingOfficer: "",
        chassisNo: "",
        engineNo: "",
        fileNo: "",
      });
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const content = {
        topNo: formData.topNo,
        firstName: formData.firstName,
        middleInitial: formData.middleInitial,
        lastName: formData.lastName,
        suffix: formData.suffix,
        violations: formData.violations,
        violationType: formData.violationType,
        licenseType: formData.violationType === "confiscated" ? formData.licenseType : undefined,
        plateNo: formData.plateNo,
        apprehendingOfficer: formData.apprehendingOfficer,
        chassisNo: formData.chassisNo,
        engineNo: formData.engineNo,
        fileNo: formData.fileNo,
      };

      // Only include dateOfApprehension if it has a value
      if (formData.dateOfApprehension) {
        content.dateOfApprehension = formData.dateOfApprehension;
      }

      const { data } = await apiClient.post("/violations", content, {
        headers: {
          Authorization: token,
        },
      });

      if (data.success) {
        toast.success("Violation has been added", {
          description: formatDate(Date.now()),
        });

        // Reset form
        form.reset({
          topNo: "",
          firstName: "",
          middleInitial: "",
          lastName: "",
          suffix: "",
          violations: [""],
          violationType: "confiscated",
          licenseType: undefined,
          plateNo: "",
          dateOfApprehension: undefined,
          apprehendingOfficer: "",
          chassisNo: "",
          engineNo: "",
          fileNo: "",
        });

        // Reset search
        setSelectedViolator(null);
        setSearchTerm("");
        setIsViolatorEditable(true);

        // Close modal and refresh data
        handleOpenChange(false);
        if (onViolationAdded) {
          onViolationAdded();
        }
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to add violation";
      toast.error(message, {
        description: formatDate(Date.now()),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-visible">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Add New Violation
          </DialogTitle>
          <DialogDescription>
            Search and select a violator to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-1 py-2 overflow-y-auto">
          {/* Violator Search Section - Fixed */}
          <div className="flex-shrink-0 mb-4 overflow-visible">
            <Label>Violator Information</Label>
            <div className="mt-1">
              <Label className="text-muted-foreground mb-0">
                Search and Select Violator
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Format: Firstname Surname
              </p>
              <div className="relative z-50 overflow-visible">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={searchInputRef}
                      placeholder="Type violator name to search..."
                      value={searchTerm}
                      onChange={(e) => {
                        const capitalizedValue = e.target.value.toUpperCase();
                        setSearchTerm(capitalizedValue);
                        if (!isViolatorEditable) {
                          setIsViolatorEditable(true);
                        }
                      }}
                      onFocus={() => {
                        if (!isViolatorEditable) {
                          setIsViolatorEditable(true);
                        }
                      }}
                      className="pr-10 text-sm"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!isSearching && searchTerm && isViolatorEditable && (
                      <button
                        type="button"
                        onClick={handleClearViolator}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Search Results Dropdown - Scrollable */}
                {(searchResults.length > 0 || showNoResults) && isViolatorEditable && (
                  <div className="absolute z-[100] w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                    {searchResults.map((violator) => (
                      <div
                        key={violator._id}
                        className="p-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors flex items-center justify-between"
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleViolatorSelect(violator)}
                        >
                          <div className="text-sm font-medium text-foreground">
                            {formatNameFirstLast(violator.firstName, violator.lastName)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            TOP: {violator.topNo || "N/A"} {violator.plateNo ? `• Plate: ${violator.plateNo}` : ""}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open Driver/Owner Information modal
                            setSelectedViolatorForInfo(violator);
                            setDriverOwnerInfoModalOpen(true);
                          }}
                          className="ml-2 h-6 w-6 p-0 hover:bg-orange-50"
                        >
                          <Eye className="h-3 w-3 text-orange-600" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Add as New Violator Option */}
                    {showNoResults && searchResults.length === 0 && searchTerm.trim().length >= 2 && (
                      <div
                        className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0 bg-accent/50 transition-colors"
                        onClick={handleAddAsNewViolator}
                      >
                        <div className="text-sm font-medium text-primary">
                          + Add "{searchTerm}" as new violator
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Click to create a new violator record with this name
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Violator Display */}
                {selectedViolator && !isViolatorEditable && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-[#18181B] border border-green-200 dark:border-[#424242] rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-green-800 dark:text-gray-200">
                          Selected: <span className="dark:text-white dark:font-semibold">{formatNameFirstLast(selectedViolator.firstName, selectedViolator.lastName)}</span>
                        </div>
                        <div className="text-xs text-green-600 dark:text-gray-400">
                          TOP: {selectedViolator.topNo || "N/A"} {selectedViolator.plateNo ? `• Plate: ${selectedViolator.plateNo}` : ""}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearViolator}
                        className="text-green-600 hover:text-green-800 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="flex-1 overflow-y-auto">
            <FormComponent
              form={form}
              onSubmit={onSubmit}
              submitting={submitting}
              isEditMode={false}
            violationOptions={violationOptions}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-start gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="violation-form"
            disabled={submitting}
            className="flex items-center gap-2 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            {submitting ? "Adding..." : "Add Violation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Driver/Owner Information Modal */}
    <DriverOwnerInfoModal
      open={driverOwnerInfoModalOpen}
      onOpenChange={setDriverOwnerInfoModalOpen}
      violatorData={selectedViolatorForInfo}
    />

    {/* Add Violator Modal */}
    <AddViolatorModal
      open={addViolatorModalOpen}
      onOpenChange={(isOpen) => {
        setAddViolatorModalOpen(isOpen);
        if (!isOpen) {
          setNameForNewViolator("");
        }
      }}
      onViolationAdded={onViolationAdded}
      searchTerm={nameForNewViolator}
    />
    </>
  );
};

export default ViolationEntryModal;
