import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { davaoOrientalData } from "@/data/region11Data";

const HierarchicalLocationSelector = ({ 
  form, 
  isEditMode = false,
  onLocationChange 
}) => {
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [selectedPurok, setSelectedPurok] = useState("");
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const [barangaySearch, setBarangaySearch] = useState("");
  const [municipalityHighlightedIndex, setMunicipalityHighlightedIndex] = useState(-1);
  const [barangayHighlightedIndex, setBarangayHighlightedIndex] = useState(-1);
  const municipalityDropdownRef = useRef(null);
  const barangayDropdownRef = useRef(null);

  // Get available options based on current selections
  const allMunicipalities = Object.keys(davaoOrientalData.municipalities);
  
  // Filter municipalities based on search input
  const municipalities = allMunicipalities.filter(municipality =>
    municipality.toLowerCase().includes(municipalitySearch.toLowerCase())
  );
  
  const allBarangays = selectedMunicipality
    ? Object.keys(davaoOrientalData.municipalities[selectedMunicipality].barangays)
    : [];
  
  // Filter barangays based on search input
  const barangays = allBarangays.filter(barangay =>
    barangay.toLowerCase().includes(barangaySearch.toLowerCase())
  );

  // Handle municipality selection
  const handleMunicipalityChange = (value) => {
    console.log('Setting municipality:', value);
    setSelectedMunicipality(value);
    setSelectedBarangay("");
    setSelectedPurok("");
    setMunicipalitySearch(""); // Clear search when municipality is selected
    setBarangaySearch(""); // Clear search when municipality changes
    setMunicipalityHighlightedIndex(-1); // Reset highlighted index
    
    // Update form values
    console.log('=== SETTING MUNICIPALITY ===');
    console.log('Setting municipality to:', value);
    form.setValue("municipality", value, { shouldValidate: true, shouldDirty: true });
    form.setValue("barangay", "", { shouldValidate: true, shouldDirty: true });
    form.setValue("purok", "", { shouldValidate: true, shouldDirty: true });
    form.setValue("province", davaoOrientalData.region, { shouldValidate: true, shouldDirty: true });
    
    console.log('Form values after municipality change:', {
      municipality: form.getValues("municipality"),
      barangay: form.getValues("barangay"),
      province: form.getValues("province")
    });
    
    // Double check immediately after setting
    setTimeout(() => {
      console.log('Form values after 100ms delay:', {
        municipality: form.getValues("municipality"),
        barangay: form.getValues("barangay"),
        province: form.getValues("province")
      });
    }, 100);
    
    if (onLocationChange) {
      onLocationChange({
        region: davaoOrientalData.region,
        municipality: value,
        barangay: "",
        purok: ""
      });
    }
  };

  // Handle barangay selection
  const handleBarangayChange = (value) => {
    console.log('Setting barangay:', value);
    setSelectedBarangay(value);
    setSelectedPurok("");
    setBarangaySearch(""); // Clear search when barangay is selected
    setBarangayHighlightedIndex(-1); // Reset highlighted index
    
    // Update form values
    console.log('=== SETTING BARANGAY ===');
    console.log('Setting barangay to:', value);
    form.setValue("barangay", value, { shouldValidate: true, shouldDirty: true });
    form.setValue("purok", "", { shouldValidate: true, shouldDirty: true });
    
    console.log('Form values after barangay change:', {
      municipality: form.getValues("municipality"),
      barangay: form.getValues("barangay"),
      province: form.getValues("province")
    });
    
    // Double check immediately after setting
    setTimeout(() => {
      console.log('Form values after barangay 100ms delay:', {
        municipality: form.getValues("municipality"),
        barangay: form.getValues("barangay"),
        province: form.getValues("province")
      });
    }, 100);
    
    if (onLocationChange) {
      onLocationChange({
        region: davaoOrientalData.region,
        municipality: selectedMunicipality,
        barangay: value,
        purok: ""
      });
    }
  };


  // Initialize region value on component mount
  useEffect(() => {
    console.log('Initializing province:', davaoOrientalData.region);
    form.setValue("province", davaoOrientalData.region, { shouldValidate: true, shouldDirty: true });
    console.log('Form values after province initialization:', {
      municipality: form.getValues("municipality"),
      barangay: form.getValues("barangay"),
      province: form.getValues("province")
    });
  }, [form]);

  // Initialize component state with existing form values (for edit mode)
  useEffect(() => {
    const currentMunicipality = form.getValues("municipality");
    const currentBarangay = form.getValues("barangay");
    const currentPurok = form.getValues("purok");
    
    console.log('=== INITIALIZING LOCATION SELECTOR ===');
    console.log('Current form values:', { currentMunicipality, currentBarangay, currentPurok });
    
    if (currentMunicipality && currentMunicipality !== selectedMunicipality) {
      console.log('Setting municipality to:', currentMunicipality);
      setSelectedMunicipality(currentMunicipality);
    }
    if (currentBarangay && currentBarangay !== selectedBarangay) {
      console.log('Setting barangay to:', currentBarangay);
      setSelectedBarangay(currentBarangay);
    }
    if (currentPurok && currentPurok !== selectedPurok) {
      console.log('Setting purok to:', currentPurok);
      setSelectedPurok(currentPurok);
    }
  }, [form.watch("municipality"), form.watch("barangay"), form.watch("purok")]);

  // Remove the complex watch effect - it was causing issues
  // We'll handle form synchronization differently

  // Handle municipality keyboard navigation
  const handleMunicipalityKeyDown = (e) => {
    if (!municipalitySearch || municipalities.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMunicipalityHighlightedIndex((prev) => 
        prev < municipalities.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMunicipalityHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (municipalityHighlightedIndex >= 0 && municipalityHighlightedIndex < municipalities.length) {
        handleMunicipalityChange(municipalities[municipalityHighlightedIndex]);
      } else if (municipalities.length === 1) {
        handleMunicipalityChange(municipalities[0]);
      }
    } else if (e.key === "Escape") {
      setMunicipalitySearch("");
      setMunicipalityHighlightedIndex(-1);
    }
  };

  // Handle barangay keyboard navigation
  const handleBarangayKeyDown = (e) => {
    if (!barangaySearch || barangays.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setBarangayHighlightedIndex((prev) => 
        prev < barangays.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setBarangayHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (barangayHighlightedIndex >= 0 && barangayHighlightedIndex < barangays.length) {
        handleBarangayChange(barangays[barangayHighlightedIndex]);
      } else if (barangays.length === 1) {
        handleBarangayChange(barangays[0]);
      }
    } else if (e.key === "Escape") {
      setBarangaySearch("");
      setBarangayHighlightedIndex(-1);
    }
  };

  // Scroll highlighted item into view for municipality
  useEffect(() => {
    if (municipalityHighlightedIndex >= 0 && municipalityDropdownRef.current) {
      const highlightedElement = municipalityDropdownRef.current.children[municipalityHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [municipalityHighlightedIndex]);

  // Scroll highlighted item into view for barangay
  useEffect(() => {
    if (barangayHighlightedIndex >= 0 && barangayDropdownRef.current) {
      const highlightedElement = barangayDropdownRef.current.children[barangayHighlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [barangayHighlightedIndex]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setMunicipalityHighlightedIndex(-1);
  }, [municipalitySearch]);

  useEffect(() => {
    setBarangayHighlightedIndex(-1);
  }, [barangaySearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if ((municipalitySearch || barangaySearch) && !event.target.closest('.relative')) {
        setMunicipalitySearch("");
        setBarangaySearch("");
        setMunicipalityHighlightedIndex(-1);
        setBarangayHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [municipalitySearch, barangaySearch]);

  return (
    <div className="space-y-2">
      {/* Province - Fixed */}
      <div className="space-y-0">
        <label className="text-xs font-medium text-muted-foreground mb-0">
          Province
        </label>
        <div className="mt-0 p-3 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-md border border-gray-300 dark:border-[#424242]">
          <span className="text-sm font-medium text-black dark:text-white">{davaoOrientalData.region}</span>
        </div>
      </div>

      {/* First Row: Municipality, Barangay, and Purok */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Municipality Selection */}
        <div className="space-y-0">
          <label className="text-xs font-medium text-muted-foreground mb-0">
            Municipality
          </label>
          <div className="relative mt-0">
            <Input
              type="text"
              autoFocus={false}
              placeholder="Type to search municipality..."
              value={selectedMunicipality || municipalitySearch}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setMunicipalitySearch(value);
                if (selectedMunicipality && value !== selectedMunicipality) {
                  setSelectedMunicipality("");
                  setSelectedBarangay("");
                  setSelectedPurok("");
                  form.setValue("municipality", "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("barangay", "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("purok", "", { shouldValidate: true, shouldDirty: true });
                }
              }}
              onKeyDown={handleMunicipalityKeyDown}
              className={cn(
                "mt-1",
                form.formState.errors.municipality && "border-red-400",
                isEditMode && "text-[8px]"
              )}
            />
            {municipalitySearch && (
              <div 
                ref={municipalityDropdownRef}
                className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg overflow-y-auto scrollbar-transparent"
                style={{ maxHeight: '8.5rem' }}
              >
                {municipalities.length > 0 ? (
                  municipalities.map((municipality, index) => (
                    <div
                      key={municipality}
                      className={cn(
                        "px-3 py-2 cursor-pointer text-sm text-foreground",
                        index === municipalityHighlightedIndex 
                          ? "bg-accent" 
                          : "hover:bg-accent"
                      )}
                      onClick={() => handleMunicipalityChange(municipality)}
                      onMouseEnter={() => setMunicipalityHighlightedIndex(index)}
                    >
                      {municipality}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No municipalities found
                  </div>
                )}
              </div>
            )}
          </div>
          {form.formState.errors.municipality && (
            <p className="text-xs text-red-400 mt-1">
              {form.formState.errors.municipality.message}
            </p>
          )}
        </div>

        {/* Barangay Selection */}
        <div className="space-y-0">
          <label className="text-xs font-medium text-muted-foreground mb-0">
            Barangay
          </label>
          <div className="relative mt-0">
            <Input
              type="text"
              autoFocus={false}
              placeholder={selectedMunicipality ? "Type to search barangay..." : "Select municipality first"}
              value={selectedBarangay || barangaySearch}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setBarangaySearch(value);
                if (selectedBarangay && value !== selectedBarangay) {
                  setSelectedBarangay("");
                  form.setValue("barangay", "", { shouldValidate: true, shouldDirty: true });
                  form.setValue("purok", "", { shouldValidate: true, shouldDirty: true });
                }
              }}
              onKeyDown={handleBarangayKeyDown}
              disabled={!selectedMunicipality}
              className={cn(
                "mt-1",
                !selectedMunicipality && "opacity-50 cursor-not-allowed",
                form.formState.errors.barangay && "border-red-400",
                isEditMode && "text-[8px]"
              )}
            />
            {selectedMunicipality && barangaySearch && (
              <div 
                ref={barangayDropdownRef}
                className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg overflow-y-auto scrollbar-transparent"
                style={{ maxHeight: '8.5rem' }}
              >
                {barangays.length > 0 ? (
                  barangays.map((barangay, index) => (
                    <div
                      key={barangay}
                      className={cn(
                        "px-3 py-2 cursor-pointer text-sm text-foreground",
                        index === barangayHighlightedIndex 
                          ? "bg-accent" 
                          : "hover:bg-accent"
                      )}
                      onClick={() => handleBarangayChange(barangay)}
                      onMouseEnter={() => setBarangayHighlightedIndex(index)}
                    >
                      {barangay}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No barangays found
                  </div>
                )}
              </div>
            )}
          </div>
          {form.formState.errors.barangay && (
            <p className="text-xs text-red-400 mt-1">
              {form.formState.errors.barangay.message}
            </p>
          )}
        </div>

        {/* Purok Selection */}
        <div className="space-y-0">
          <label className="text-xs font-medium text-muted-foreground mb-0">
            Purok
          </label>
          <div className="relative mt-0">
            <Input
              type="text"
              autoFocus={false}
              placeholder={selectedBarangay ? "Enter purok name..." : "Select barangay first"}
              value={selectedPurok || ""}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setSelectedPurok(value);
                form.setValue("purok", value, { shouldValidate: true, shouldDirty: true });
                
                if (onLocationChange) {
                  onLocationChange({
                    region: davaoOrientalData.region,
                    municipality: selectedMunicipality,
                    barangay: selectedBarangay,
                    purok: value
                  });
                }
              }}
              disabled={!selectedBarangay}
              className={cn(
                "mt-1",
                !selectedBarangay && "opacity-50 cursor-not-allowed",
                form.formState.errors.purok && "border-red-400",
                isEditMode && "text-[8px]"
              )}
            />
          </div>
          {form.formState.errors.purok && (
            <p className="text-xs text-red-400 mt-1">
              {form.formState.errors.purok.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HierarchicalLocationSelector;
