import React, { useState, useEffect } from "react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CalendarIcon, Plus, X, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import DatePicker from "@/components/calendar/DatePicker";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useWatch } from "react-hook-form";
// List of common LTO violations
const COMMON_VIOLATIONS = [
  "1A - NO DRIVER'S LICENSE/CONDUCTOR PERMIT",
  "1B - DRIVING DURING CRIME",
  "1C - CRIME DURING APPREHENSION",
  "1D - DRIVING UNDER THE INFLUENCE OF ALCOHOL/DRUGS",
  "1E - RECKLESS DRIVING",
  "1F - FAKE DOCUMENTS",
  "1G1 - NO SEATBELT (DRIVER/FRONT SEAT PASSENGER)",
  "1G2 - NO SEATBELT (PASSENGER/S)",
  "1H - NO HELMET",
  "R.A 10054 - WEARING SUBSTANDARD HELMET/NO ICC",
  "1I - FAILURE TO CARRY DRIVER'S LICENSE OR OR/CR",
  "1J1 - ILLEGAL PARKING",
  "1J2 - DISREGARDING TRAFFIC SIGNS",
  "1J3 - PASSENGERS ON ROOF/HOOD",
  "1J4 - NO CANVASS COVER OF CARGOS",
  "1J5 - PASSENGER ON RUNNING BOARD/STEPBOARD/MUDGUARD",
  "1J6 - HEADLIGHTS ARE NOT DIMMED",
  "1J7 - DRIVING PROHIBITED AREA",
  "1J8 - HITCHING PASSENGERS",
  "1J9 - DRIVING AGAINST TRAFFIC",
  "1J10 - ILLEGAL LEFT TURN AT INTERSECTION",
  "1J11 - ILLEGAL OVERTAKING",
  "1J12 - OVERTAKING AT UNSAFE DISTANCE",
  "1J13 - CUTTING AN OVERTAKEN VEHICLE",
  "1J14 - FAILURE TO GIVE WAY TO AN OVERTAKING VEHICLE",
  "1J15 - SPEEDING WHEN OVERTAKEN",
  "1J16 - OVERTAKING WITHOUT CLEAR VIEW",
  "1J17 - OVERTAKING UPON CREST OF A GRADE",
  "1J18 - OVERTAKEN UPON A CURVE",
  "1J19 - OVERTAKING AT ANY RAILWAY GRADE CROSSING",
  "1J20 - OVERTAKING AT AN INTERSECTION",
  "1J21 - OVERTAKING ON MEN WORKING OR CAUTION SIGNS",
  "1J22 - OVERTAKING AT NO OVERTAKING ZONE",
  "1J23 - FAILURE TO YIELD TO VEHICLE ON RIGHT",
  "1J24 - FAILURE TO YIELD IN INTERSECTION",
  "1J25 - FAILURE TO YIELD TO PEDESTRIAN",
  "1J26 - FAILURE TO STOP AT HIGHWAY/RAILROAD",
  "1J27 - FAILURE TO YIELD ENTERING HIGHWAY",
  "1J28 - FAILURE TO YIELD TO EMERGENCY VEHICLE",
  "1J29 - FAILURE TO YIELD AT STOP/THRU",
  "1J30 - IMPROPER SIGNALING",
  "1J31 - ILLEGAL TURN, NOT KEEPING TO RIGHT-HAND LANE",
  "1J32 - ILLEGAL TURN, IMPROPER LANE USE",
  "1J33 - LEAVING VEHICLE WITHOUT BRAKE",
  "1J34 - UNSAFE TOWING",
  "1J35 - OBSTRUCTION",
  "1J36 - EXCESS PASSENGERS/CARGO",
  "1J37 - REFUSAL TO ACCEPT PASSENGER",
  "1J38 - OVERCHARGING/UNDERCHARGING OF FARE",
  "1J39 - NO FRANCHISE/CPC",
  "1J40 - FRAUDULENT DOCS/STICKERS/CPC/OR/CR/PLATES",
  "1J41 - OPERATING WITH DEFECTIVE PARTS",
  "1J42 - FAILURE TO PROVIDE FARE DISCOUNT",
  "1J43 - FAULTY TAXIMETER",
  "1J44 - TAMPERED SEALING WIRE",
  "1J45 - NO SIGNBOARD",
  "1J46 - ILLEGAL PICK/DROP",
  "1J47 - ILLEGAL CARGOES",
  "1J48 - MISSING FIRE EXTINGUISHER/SIGNS",
  "1J49 - TRIP CUTTING",
  "1J50 - FAILURE TO DISPLAY FARE MATRIX",
  "1J51 - BREACH OF FRANCHISE",
  "RA 10913 - VIOLATING ANTI-DISTRACTED DRIVING ACT",
  "RA 10666 - VIOLATING CHILDREN’S SAFETY ON MOTORCYCLES ACT",
  "RA 78749 - SMOKE BELCHING",
  "2A - UNREGISTERED MV",
  "2B - UNAUTHORIZED MV MODIFICATION",
  "2C - RIGHT-HAND DRIVE MV",
  "2D - OPERATING WITH DEFECTIVE PARTS",
  "2E - IMPROPER PLATES/STICKER",
  "2F - SMOKE BELCHING",
  "2G - FRAUD IN REGISTRATION/RENEWAL",
  "2H - ALL OTHER MV VIOLATIONS",
  "3A - OVERWIDTH LOAD",
  "3B - AXLE OVERLOADING",
  "3C - BUS/TRUCK OVERLOADED WITH CARGO",
  "4-8 - UNAUTHORIZED/NO-LICENSE DRIVER",
  "4-7 - RECKLESS/INSOLENT/ARROGANT DRIVER",
  "4-2 - REFUSAL TO ACCEPT PASSENGER",
  "4-3 - OVERCHARGING/UNDERCHARGING OF FARE",
  "4-5 - NO FRANCHISE/CPC",
  "4-6 - FRAUDULENT DOCS,STICKERS,CPC,OR/CR,PLATES",
  "4-9 - OPERATING WITH DEFECTIVE PARTS",
  "4-10 - FAILURE TO PROVIDE FARE DISCOUNT",
  "4-13 - FAULTY TAXIMETER",
  "4-14 - TAMPERED SEALING WIRE",
  "4-18 - NO SIGNBOARD",
  "4-19 - ILLEGAL PICK/DROP",
  "4-20 - ILLEGAL CARGOES",
  "4-21 - MISSING FIRE EXTINGUISHER/SIGNS",
  "4-22 - TRIP CUTTING",
  "4-23 - FAILURE TO DISPLAY FARE MATRIX",
  "4-25 - BREACH OF FRANCHISE",
  "4-1 - COLORUM OPERATION",
  "4-4 - MISSING BODY MARKINGS",
  "4-11 - WRONG OPERATOR INFO",
  "4-12 - MISSING/ALLOWING SMOKING",
  "4-15 - UNAUTHORIZED COLOR/DESIGN",
  "4-16 - UNREGISTERED TRADE NAME",
  "4-17 - NO PANEL ROUTE",
  "N5-1 - MOTORCYCLE DRIVER WEARING FLIPFLOPS/SANDALS/SLIPPERS",
  "4-24 - MISSING PWD/ACCESS SYMBOLS",
  "N1 - NOT WEARING HELMET"
].sort();

const FormComponent = ({ form, onSubmit, submitting, isEditMode = false }) => {
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [violationToRemove, setViolationToRemove] = useState(null);
  const [availableViolations] = useState(COMMON_VIOLATIONS);
  const [violationSearchTerms, setViolationSearchTerms] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Watch the violationType to conditionally render fields
  const violationType = useWatch({
    control: form.control,
    name: "violationType",
    defaultValue: "confiscated"
  });

  // In add mode, when violation type is not 'confiscated', clear license type
  useEffect(() => {
    if (!isEditMode && violationType !== "confiscated") {
      form.setValue("licenseType", undefined, { shouldValidate: true, shouldDirty: true });
    }
  }, [violationType, isEditMode, form]);

  // Watch form violations and sync with local state
  const formViolations = useWatch({
    control: form.control,
    name: "violations",
    defaultValue: []
  });

  // Initialize violations array and sync with form data
  useEffect(() => {
    console.log("=== VIOLATIONS USEEFFECT TRIGGERED ===");
    console.log("formViolations:", formViolations);
    console.log("violations.length:", violations.length);
    console.log("current violations state:", violations);
    
    if (formViolations && formViolations.length > 0) {
      // Don't filter out empty strings - we need them for new violation inputs
      console.log("Setting violations to formViolations:", formViolations);
      setViolations(formViolations);
      // Initialize search terms for each violation
      const searchTerms = {};
      formViolations.forEach((v, index) => {
        if (v) {
          searchTerms[index] = v;
        }
      });
      setViolationSearchTerms(searchTerms);
    } else if (violations.length === 0) {
      console.log("No form violations, setting to [\"\"]");
      setViolations([""]);
      form.setValue("violations", [""]);
    }
  }, [formViolations, form]);

  const addViolation = () => {
    console.log("=== ADD VIOLATION CLICKED ===");
    console.log("Current violations state:", violations);
    console.log("Current form violations:", formViolations);
    
    const newViolations = [...violations, ""];
    console.log("New violations array:", newViolations);
    
    setViolations(newViolations);
    form.setValue("violations", newViolations);
    
    console.log("After setViolations and setValue");
    console.log("Updated violations state:", newViolations);
  };

  const removeViolation = (index) => {
    if (violations.length > 1) {
      // Only show confirmation modal in edit mode if the violation has content
      if (isEditMode && violations[index] && violations[index].trim() !== "") {
        setViolationToRemove(index);
        setShowRemoveModal(true);
      } else {
        // In add mode or if violation is empty, remove directly
        const newViolations = violations.filter((_, i) => i !== index);
        setViolations(newViolations);
        form.setValue("violations", newViolations);
        
        // Clean up search terms and dropdown state
        setViolationSearchTerms((prev) => {
          const updated = { ...prev };
          delete updated[index];
          // Reindex remaining search terms
          const reindexed = {};
          Object.keys(updated).forEach((key) => {
            const keyNum = parseInt(key);
            if (keyNum > index) {
              reindexed[keyNum - 1] = updated[key];
            } else {
              reindexed[key] = updated[key];
            }
          });
          return reindexed;
        });
        
        setOpenDropdowns((prev) => {
          const updated = { ...prev };
          delete updated[index];
          // Reindex remaining dropdown states
          const reindexed = {};
          Object.keys(updated).forEach((key) => {
            const keyNum = parseInt(key);
            if (keyNum > index) {
              reindexed[keyNum - 1] = updated[key];
            } else {
              reindexed[key] = updated[key];
            }
          });
          return reindexed;
        });
      }
    }
  };

  const confirmRemoveViolation = () => {
    if (violationToRemove !== null) {
      const newViolations = violations.filter((_, i) => i !== violationToRemove);
      setViolations(newViolations);
      form.setValue("violations", newViolations);
      
      // Clean up search terms and dropdown state
      setViolationSearchTerms((prev) => {
        const updated = { ...prev };
        delete updated[violationToRemove];
        // Reindex remaining search terms
        const reindexed = {};
        Object.keys(updated).forEach((key) => {
          const keyNum = parseInt(key);
          if (keyNum > violationToRemove) {
            reindexed[keyNum - 1] = updated[key];
          } else {
            reindexed[key] = updated[key];
          }
        });
        return reindexed;
      });
      
      setOpenDropdowns((prev) => {
        const updated = { ...prev };
        delete updated[violationToRemove];
        // Reindex remaining dropdown states
        const reindexed = {};
        Object.keys(updated).forEach((key) => {
          const keyNum = parseInt(key);
          if (keyNum > violationToRemove) {
            reindexed[keyNum - 1] = updated[key];
          } else {
            reindexed[key] = updated[key];
          }
        });
        return reindexed;
      });
    }
    setShowRemoveModal(false);
    setViolationToRemove(null);
  };

  const cancelRemoveViolation = () => {
    setShowRemoveModal(false);
    setViolationToRemove(null);
  };

  const updateViolation = (index, value, closeDropdown = false) => {
    const newViolations = [...violations];
    newViolations[index] = value;
    setViolations(newViolations);
    form.setValue("violations", newViolations);
    
    // Update search term
    setViolationSearchTerms((prev) => ({
      ...prev,
      [index]: value,
    }));
    
    // Close dropdown only if explicitly requested (when selecting from dropdown)
    if (closeDropdown) {
      setOpenDropdowns((prev) => ({
        ...prev,
        [index]: false,
      }));
    }
  };

  const handleViolationSearchChange = (index, value) => {
    setViolationSearchTerms((prev) => ({
      ...prev,
      [index]: value,
    }));
    
    // Update violation value as user types (don't close dropdown)
    updateViolation(index, value, false);
    
    // Open dropdown when user starts typing
    if (value && !openDropdowns[index]) {
      setOpenDropdowns((prev) => ({
        ...prev,
        [index]: true,
      }));
    }
  };

  const handleViolationSelect = (index, value) => {
    // Close dropdown when value is selected from dropdown
    updateViolation(index, value, true);
  };

  const handleViolationInputFocus = (index) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

  const handleViolationInputBlur = (index) => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => {
      setOpenDropdowns((prev) => ({
        ...prev,
        [index]: false,
      }));
    }, 200);
  };

  // Filter violations based on search term
  const getFilteredViolations = (index) => {
    const searchTerm = (violationSearchTerms[index] || "").toLowerCase().trim();
    if (!searchTerm) {
      return availableViolations;
    }
    return availableViolations.filter((violation) =>
      violation.toLowerCase().includes(searchTerm)
    );
  };

  const handleFormSubmit = (data) => {
    console.log("=== FORM COMPONENT SUBMIT ===");
    console.log("Form submitted with data:", data);
    console.log("Form state:", form.formState);
    console.log("Form errors:", form.formState.errors);
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form id="violation-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Violation Type, TOP NO., and Apprehending Officer in the same row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="violationType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Violation Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select violation type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="confiscated">Confiscated</SelectItem>
                    <SelectItem value="alarm">Alarm</SelectItem>
                    <SelectItem value="impounded">Impounded</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="topNo"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">TOP NO.</FormLabel>
                <FormControl>
                    <Input 
                      placeholder="TOP-0001" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      readOnly={isEditMode}
                      className={cn(
                        "text-xs",
                        isEditMode && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-gray-600"
                      )}
                    />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apprehendingOfficer"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Apprehending Officer</FormLabel>
                <FormControl>
                    <Input 
                      placeholder="Officer Name" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Violator's Details Section - Always show in add mode, conditional in edit mode */}
        {!isEditMode || (violationType === "confiscated" || violationType === "impounded") ? (
          <div className="space-y-0">
            <h6 className="text-sm font-semibold">Violater's Details</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">First Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middleInitial"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Middle Initial</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="D" 
                      maxLength={1} 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Last Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Doe" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="suffix"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Suffix</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Jr." 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
          </div>
        ) : null}

        {/* Violations Section - Always show in both add and edit mode */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Violation/s</label>
            {console.log("=== RENDERING VIOLATIONS ===", violations)}
            {violations.map((violation, index) => {
              console.log(`Rendering violation ${index}:`, violation);
              const searchTerm = violationSearchTerms[index] || violation || "";
              const filteredViolations = getFilteredViolations(index);
              const isDropdownOpen = openDropdowns[index];
              
              return (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder={`Violation ${index + 1} - Type to search or select from dropdown`}
                      value={violation || ""}
                      onChange={(e) => handleViolationSearchChange(index, e.target.value)}
                      onFocus={() => handleViolationInputFocus(index)}
                      onBlur={() => handleViolationInputBlur(index)}
                      className="text-xs"
                    />
                    {isDropdownOpen && filteredViolations.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredViolations.map((violationOption) => (
                          <div
                            key={violationOption}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-gray-900 dark:text-gray-100"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleViolationSelect(index, violationOption);
                            }}
                          >
                            {violationOption}
                          </div>
                        ))}
                      </div>
                    )}
                    {isDropdownOpen && filteredViolations.length === 0 && searchTerm && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                          No violations found. You can still type a custom violation.
                        </div>
                      </div>
                    )}
                  </div>
                  {violations.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeViolation(index)}
                      className="border border-gray-300 dark:border-[#424242] bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              onClick={addViolation}
              className="w-full text-xs border border-gray-300 dark:border-[#424242] bg-white dark:bg-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Violation
            </Button>
          </div>
        </div>

        {/* License Type Section - In add mode always show; disabled unless 'confiscated'. In edit mode only when 'confiscated'. */}
        {!isEditMode || violationType === "confiscated" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="licenseType"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">License Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger
                        disabled={!isEditMode && violationType !== "confiscated"}
                        className={`text-xs ${(!isEditMode && violationType !== "confiscated") ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}`}
                      >
                        <SelectValue placeholder={field.value === "null" ? "null" : "Select license type"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SP">SP (Student Permit)</SelectItem>
                      <SelectItem value="DL">DL (Driver's License)</SelectItem>
                      <SelectItem value="CL">CL (Commercial License)</SelectItem>
                      <SelectItem value="PLATE">PLATE</SelectItem>
                      <SelectItem value="SP RECEIPT">SP RECEIPT</SelectItem>
                      <SelectItem value="DL RECEIPT">DL RECEIPT</SelectItem>
                      <SelectItem value="REFUSE TO SUR.">REFUSE TO SUR.</SelectItem>
                      <SelectItem value="DL TEMPORARY">DL TEMPORARY</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="null">null</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <div></div>
          </div>
          </div>
        ) : null}

        {/* Vehicle Details Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="plateNo"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Plate No.</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC-1234" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chassisNo"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Chassis No. (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Chassis Number" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="engineNo"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Engine No. (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Engine Number" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fileNo"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">File No. (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="File Number" 
                      {...field}
                      value={field.value === "null" ? "null" : field.value || ""}
                      className={cn("text-xs", field.value === "null" && "text-gray-400 dark:text-gray-500")}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Apprehension Information Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dateOfApprehension"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">Date of Apprehension</FormLabel>
                  <FormControl>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal text-xs border border-gray-300 dark:border-[#424242] bg-white dark:bg-gray-800",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePicker
                          fieldValue={field.value}
                          dateValue={(date) => {
                            field.onChange(date);
                            // Close popover after date selection
                            setDatePickerOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>


        {/* Removed duplicate buttons - using modal footer buttons instead */}
      </form>

      {/* Remove Violation Confirmation Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Remove Violation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this violation from this driver? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={cancelRemoveViolation}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRemoveViolation}
              className="min-w-[80px] bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};

export default FormComponent;