import React, { useState, useEffect } from "react";
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
  const [purokSearch, setPurokSearch] = useState("");

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
  
  const allPuroks = selectedMunicipality && selectedBarangay
    ? davaoOrientalData.municipalities[selectedMunicipality].barangays[selectedBarangay].puroks
    : [];
  
  // Filter puroks based on search input
  const puroks = allPuroks.filter(purok =>
    purok.toLowerCase().includes(purokSearch.toLowerCase())
  );

  // Handle municipality selection
  const handleMunicipalityChange = (value) => {
    console.log('Setting municipality:', value);
    setSelectedMunicipality(value);
    setSelectedBarangay("");
    setSelectedPurok("");
    setMunicipalitySearch(""); // Clear search when municipality is selected
    setBarangaySearch(""); // Clear search when municipality changes
    setPurokSearch(""); // Clear search when municipality changes
    
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
    setPurokSearch(""); // Clear search when barangay changes
    
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

  // Handle purok selection
  const handlePurokChange = (value) => {
    setSelectedPurok(value);
    setPurokSearch(""); // Clear search when purok is selected
    
    // Update form values
    form.setValue("purok", value, { shouldValidate: true, shouldDirty: true });
    
    if (onLocationChange) {
      onLocationChange({
        region: davaoOrientalData.region,
        municipality: selectedMunicipality,
        barangay: selectedBarangay,
        purok: value
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if ((municipalitySearch || barangaySearch || purokSearch) && !event.target.closest('.relative')) {
        setMunicipalitySearch("");
        setBarangaySearch("");
        setPurokSearch("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [municipalitySearch, barangaySearch, purokSearch]);

  return (
    <div className="space-y-2">
      {/* Province - Fixed */}
      <div className="space-y-0">
        <label className="text-xs font-medium text-muted-foreground mb-0">
          Province
        </label>
        <div className="mt-0 p-3 bg-muted rounded-md border">
          <span className="text-sm font-medium">{davaoOrientalData.region}</span>
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
              className={cn(
                "mt-1",
                form.formState.errors.municipality && "border-red-400",
                isEditMode && "text-[8px]"
              )}
            />
            {municipalitySearch && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto scrollbar-transparent">
                {municipalities.length > 0 ? (
                  municipalities.map((municipality) => (
                    <div
                      key={municipality}
                      className="px-3 py-2 cursor-pointer hover:bg-accent text-sm text-foreground"
                      onClick={() => handleMunicipalityChange(municipality)}
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
              disabled={!selectedMunicipality}
              className={cn(
                "mt-1",
                !selectedMunicipality && "opacity-50 cursor-not-allowed",
                form.formState.errors.barangay && "border-red-400",
                isEditMode && "text-[8px]"
              )}
            />
            {selectedMunicipality && barangaySearch && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto scrollbar-transparent">
                {barangays.length > 0 ? (
                  barangays.map((barangay) => (
                    <div
                      key={barangay}
                      className="px-3 py-2 cursor-pointer hover:bg-accent text-sm text-foreground"
                      onClick={() => handleBarangayChange(barangay)}
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
              placeholder={selectedBarangay ? "Type to search purok..." : "Select barangay first"}
              value={selectedPurok || purokSearch}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setPurokSearch(value);
                if (selectedPurok && value !== selectedPurok) {
                  setSelectedPurok("");
                  form.setValue("purok", "", { shouldValidate: true, shouldDirty: true });
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
            {selectedBarangay && purokSearch && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto scrollbar-transparent">
                {puroks.length > 0 ? (
                  puroks.map((purok) => (
                    <div
                      key={purok}
                      className="px-3 py-2 cursor-pointer hover:bg-accent text-sm text-foreground"
                      onClick={() => handlePurokChange(purok)}
                    >
                      {purok}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No puroks found
                  </div>
                )}
              </div>
            )}
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
