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
import FormComponent from "./FormComponent";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { ViolationCreateSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { AlertTriangle, LoaderCircle, X, Edit3, Eye } from "lucide-react";

const AddViolationModal = ({ open, onOpenChange, onViolationAdded, initialValues }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const [allViolations, setAllViolations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [selectedViolator, setSelectedViolator] = useState(null);
  const [isViolatorEditable, setIsViolatorEditable] = useState(true);
  const searchInputRef = React.useRef(null);

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
        if (results.length === 0 && searchTerm.length >= 3) {
          setShowNoResults(true);
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
    form.setValue("firstName", violator.firstName || "");
    form.setValue("lastName", violator.lastName || "");
    form.setValue("middleInitial", violator.middleInitial || "");
    form.setValue("suffix", violator.suffix || "");
    form.setValue("plateNo", violator.plateNo || "");
    form.setValue("chassisNo", violator.chassisNo || "");
    form.setValue("engineNo", violator.engineNo || "");
    form.setValue("fileNo", violator.fileNo || "");
    setSearchTerm(formatNameFirstLast(violator.firstName, violator.lastName));
    setSearchResults([]);
    setShowNoResults(false);
    setIsViolatorEditable(false);
  };

  const handleClearViolator = () => {
    setSelectedViolator(null);
    form.setValue("firstName", "");
    form.setValue("lastName", "");
    form.setValue("middleInitial", "");
    form.setValue("suffix", "");
    setSearchTerm("");
    setSearchResults([]);
    setShowNoResults(false);
    setIsViolatorEditable(true);
  };

  const handleAddAsNew = () => {
    const raw = (searchTerm || "").trim();
    if (!raw) return;
    const parts = raw.split(/\s+/);
    const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
    form.setValue("firstName", firstName);
    form.setValue("lastName", lastName);
    setSearchTerm("");
    setShowNoResults(false);
    setSelectedViolator(null);
    setIsViolatorEditable(false);
  };

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
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
          description: date,
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

        // Close modal and refresh data
        onOpenChange(false);
        if (onViolationAdded) {
          onViolationAdded();
        }
      }
    } catch (error) {
      console.log(error);
      const message = error.response?.data?.message || "Failed to add violation";
      toast.error(message, {
        description: date,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !submitting) {
      // Reset form when closing modal
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

      // Clear search state so previous results don't persist between openings
      setSearchTerm("");
      setAllViolations([]);
      setSearchResults([]);
      setSelectedViolator(null);
      setIsViolatorEditable(true);
    }
    onOpenChange(isOpen);
  };

  // Apply initial values when opening
  React.useEffect(() => {
    if (open && initialValues) {
      form.reset({
        topNo: "",
        firstName: initialValues.firstName || "",
        middleInitial: "",
        lastName: initialValues.lastName || "",
        suffix: "",
        violations: [""],
        violationType: "confiscated",
        licenseType: undefined,
        plateNo: initialValues.plateNo || "",
        dateOfApprehension: undefined,
        apprehendingOfficer: "",
        chassisNo: initialValues.chassisNo || "",
        engineNo: initialValues.engineNo || "",
        fileNo: initialValues.fileNo || "",
      });
      // also ensure search UI is blank on open
      setSearchTerm("");
      setShowNoResults(false);
      setSelectedViolator(null);
      setIsViolatorEditable(true);
    } else if (open && !initialValues) {
      setSearchTerm("");
      setShowNoResults(false);
      setSelectedViolator(null);
      setIsViolatorEditable(true);
    }
  }, [open, initialValues]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Add New Violation
          </DialogTitle>
          <DialogDescription>
            Fill in the required fields to add a new violation record to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          {/* Violator Search Section - matching vehicle form structure */}
          <div className="mb-4">
            <Label>Violator Information</Label>
            <div className="mt-1">
              <Label className="text-muted-foreground mb-0">
                Search and Select Violator
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Format: Surname Suffix (Optional), FirstName, Middle Initial
              </p>
              <div className="relative">
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
                
                {/* Search Results Dropdown */}
                {(searchResults.length > 0 || showNoResults) && isViolatorEditable && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
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
                            onOpenChange(false);
                            window.dispatchEvent(new CustomEvent('editViolation', { detail: violator._id }));
                          }}
                          className="ml-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Add Violator Option - only show when no results and not already selected */}
                    {showNoResults && searchResults.length === 0 && !selectedViolator && (
                      <div
                        className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0 bg-accent/50 transition-colors"
                        onClick={handleAddAsNew}
                      >
                        <div className="text-sm font-medium text-primary">
                          + Add "{searchTerm}" as new violator
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Click to create a new violator record
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
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsViolatorEditable(true)}
                          className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main form */}
          <FormComponent
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
            isEditMode={false}
          />
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
  );
};

export default AddViolationModal;
