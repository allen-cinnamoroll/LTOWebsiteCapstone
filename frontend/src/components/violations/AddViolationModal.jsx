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
import FormComponent from "./FormComponent";
import { formatDate } from "@/util/dateFormatter";
import { toast } from "sonner";
import { ViolationCreateSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { AlertTriangle, Search, LoaderCircle, User, Car } from "lucide-react";

const AddViolationModal = ({ open, onOpenChange, onViolationAdded, initialValues }) => {
  const [submitting, setIsSubmitting] = useState(false);
  const { token } = useAuth();
  const date = formatDate(Date.now());

  const [allViolations, setAllViolations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [showSearchSection, setShowSearchSection] = useState(true);

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

  const normalized = (s) => (s || "").toString().trim().toLowerCase();
  const filteredViolators = React.useMemo(() => {
    const q = normalized(searchTerm);
    if (q.length < 2) {
      if (showNoResults) setShowNoResults(false);
      return [];
    }
    const results = allViolations.filter((v) => {
      const first = normalized(v.firstName);
      const last = normalized(v.lastName);
      const full1 = `${first} ${last}`.trim();
      const full2 = `${last} ${first}`.trim();
      return first.includes(q) || last.includes(q) || full1.includes(q) || full2.includes(q);
    });
    setShowNoResults(q.length >= 2 && results.length === 0);
    return results;
  }, [searchTerm, allViolations, showNoResults]);

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
    setShowSearchSection(false);
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
      setShowSearchSection(true);
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
      setShowSearchSection(true);
    } else if (open && !initialValues) {
      setSearchTerm("");
      setShowNoResults(false);
      setShowSearchSection(true);
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
          {/* Search & Select Violator section (top) */}
          {showSearchSection && (
          <div className="mb-4">
            <div className="mb-1 text-sm font-medium text-gray-700">Search and Select Violator</div>
            <p className="text-xs text-gray-500 mb-2">Search existing violators to edit, or continue filling the form to add a new one.</p>
            <div className="relative">
              <input
                placeholder="Search by first name surname"
                onChange={() => {}}
                className="hidden"
                aria-hidden="true"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by first name surname"
                  className="pl-8 text-sm w-full border rounded-md h-9 px-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {searchTerm.trim().length >= 2 && filteredViolators.length > 0 && (
              <div className="mt-2 border rounded-md max-h-64 overflow-y-auto">
                {filteredViolators.map((v) => (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new CustomEvent('editViolation', { detail: v._id }));
                    }}
                    className="w-full text-left p-3 border-b last:border-b-0 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium">{(v.firstName || '').trim()} {(v.lastName || '').trim()}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.trim().length >= 2 && showNoResults && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleAddAsNew}
                  className="w-full flex items-center justify-between p-3 text-sm rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M12 4.5a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-6H6a.75.75 0 0 1 0-1.5h5.25V5.25A.75.75 0 0 1 12 4.5Z" clipRule="evenodd" />
                    </svg>
                    Add "{searchTerm}" as a new violator
                  </span>
                  <span className="text-[11px] text-blue-600">Press Enter</span>
                </button>
              </div>
            )}
          </div>
          )}

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
