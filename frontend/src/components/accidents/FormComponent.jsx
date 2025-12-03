import React, { useState, useEffect } from "react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DatePicker from "@/components/calendar/DatePicker";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { davaoOrientalData } from "@/data/region11Data";

// Default options
const DEFAULT_INCIDENT_TYPES = [
  "(Incident) Vehicular Accident",
  "(Simple) Police Dispatch for Incident Response",
  "(Incident) Accident caused by negligence",
  "(Simple) Police Dispatch to secure and area/checkpoint",
  "(Operation) Buy Bust"
];

const DEFAULT_OFFENSE_TYPES = [
  "Crimes Against Persons",
  "Crimes Against Property"
];

const FormComponent = ({ form, onSubmit, submitting, isEditMode = false }) => {
  const navigate = useNavigate();
  
  // State for custom options
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [offenseTypes, setOffenseTypes] = useState([]);
  const [showIncidentTypeInput, setShowIncidentTypeInput] = useState(false);
  const [showOffenseTypeInput, setShowOffenseTypeInput] = useState(false);
  
  // State for location
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  
  // Get municipalities and barangays from data
  const municipalities = Object.keys(davaoOrientalData.municipalities);
  const barangays = selectedMunicipality 
    ? Object.keys(davaoOrientalData.municipalities[selectedMunicipality]?.barangays || {})
    : [];

  // Load custom options from localStorage on mount
  useEffect(() => {
    const storedIncidentTypes = localStorage.getItem("customIncidentTypes");
    const storedOffenseTypes = localStorage.getItem("customOffenseTypes");
    
    if (storedIncidentTypes) {
      setIncidentTypes([...DEFAULT_INCIDENT_TYPES, ...JSON.parse(storedIncidentTypes)]);
    } else {
      setIncidentTypes(DEFAULT_INCIDENT_TYPES);
    }
    
    if (storedOffenseTypes) {
      setOffenseTypes([...DEFAULT_OFFENSE_TYPES, ...JSON.parse(storedOffenseTypes)]);
    } else {
      setOffenseTypes(DEFAULT_OFFENSE_TYPES);
    }
  }, []);

  // Check if current value is "Others" or if it's a custom value on mount
  useEffect(() => {
    const currentIncidentType = form.getValues("incidentType");
    const currentOffenseType = form.getValues("offenseType");
    
    if (currentIncidentType && !incidentTypes.includes(currentIncidentType) && currentIncidentType !== "Others") {
      setShowIncidentTypeInput(false);
    } else if (currentIncidentType === "Others") {
      setShowIncidentTypeInput(true);
    }
    
    if (currentOffenseType && !offenseTypes.includes(currentOffenseType) && currentOffenseType !== "Others") {
      setShowOffenseTypeInput(false);
    } else if (currentOffenseType === "Others") {
      setShowOffenseTypeInput(true);
    }
  }, [incidentTypes, offenseTypes]);

  // Set default region and province values on mount
  useEffect(() => {
    const currentRegion = form.getValues("region");
    const currentProvince = form.getValues("province");
    
    if (!currentRegion || currentRegion === "") {
      form.setValue("region", "REGION 11", { shouldValidate: true });
    }
    if (!currentProvince || currentProvince === "") {
      form.setValue("province", "DAVAO ORIENTAL", { shouldValidate: true });
    }
    
    // Initialize selected municipality from form value
    const currentMunicipality = form.getValues("municipality");
    if (currentMunicipality && municipalities.includes(currentMunicipality)) {
      setSelectedMunicipality(currentMunicipality);
    }
  }, [form]);

  // Watch municipality value to sync selectedMunicipality state (for edit mode)
  const municipalityValue = form.watch("municipality");
  useEffect(() => {
    if (municipalityValue && municipalities.includes(municipalityValue)) {
      setSelectedMunicipality(municipalityValue);
    } else if (!municipalityValue) {
      setSelectedMunicipality("");
    }
  }, [municipalityValue, municipalities]);

  // Handle incident type change
  const handleIncidentTypeChange = (value) => {
    if (value === "Others") {
      setShowIncidentTypeInput(true);
      form.setValue("incidentType", "");
    } else {
      setShowIncidentTypeInput(false);
      form.setValue("incidentType", value);
    }
  };

  // Handle offense type change
  const handleOffenseTypeChange = (value) => {
    if (value === "Others") {
      setShowOffenseTypeInput(true);
      form.setValue("offenseType", "");
    } else {
      setShowOffenseTypeInput(false);
      form.setValue("offenseType", value);
    }
  };

  // Handle municipality change
  const handleMunicipalityChange = (value) => {
    setSelectedMunicipality(value);
    form.setValue("municipality", value, { shouldValidate: true });
    // Clear barangay when municipality changes - don't validate to avoid showing error immediately
    form.setValue("barangay", "", { shouldValidate: false });
    // Clear any existing error for barangay
    form.clearErrors("barangay");
  };

  // Handle barangay change
  const handleBarangayChange = (value) => {
    form.setValue("barangay", value, { shouldValidate: true });
  };

  // Save custom values to localStorage and update dropdown
  const saveCustomValues = () => {
    const currentIncidentType = form.getValues("incidentType");
    const currentOffenseType = form.getValues("offenseType");

    // Save custom incident type if it's not in the default list
    if (currentIncidentType && !DEFAULT_INCIDENT_TYPES.includes(currentIncidentType)) {
      const storedIncidentTypes = localStorage.getItem("customIncidentTypes");
      const customIncidentTypes = storedIncidentTypes ? JSON.parse(storedIncidentTypes) : [];
      
      if (!customIncidentTypes.includes(currentIncidentType)) {
        customIncidentTypes.push(currentIncidentType);
        localStorage.setItem("customIncidentTypes", JSON.stringify(customIncidentTypes));
        setIncidentTypes([...DEFAULT_INCIDENT_TYPES, ...customIncidentTypes]);
      }
    }

    // Save custom offense type if it's not in the default list
    if (currentOffenseType && !DEFAULT_OFFENSE_TYPES.includes(currentOffenseType)) {
      const storedOffenseTypes = localStorage.getItem("customOffenseTypes");
      const customOffenseTypes = storedOffenseTypes ? JSON.parse(storedOffenseTypes) : [];
      
      if (!customOffenseTypes.includes(currentOffenseType)) {
        customOffenseTypes.push(currentOffenseType);
        localStorage.setItem("customOffenseTypes", JSON.stringify(customOffenseTypes));
        setOffenseTypes([...DEFAULT_OFFENSE_TYPES, ...customOffenseTypes]);
      }
    }
  };

  // Wrap onSubmit to save custom values first
  const handleFormSubmit = async (data) => {
    saveCustomValues();
    return onSubmit(data);
  };

  return (
    <Form {...form}>
      <form id="accident-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Row 1: Blotter No */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="blotterNo"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Blotter No.</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="0000000-000000" 
                    {...field}
                    onChange={(e) => {
                      // Only allow numeric characters (0-9) and special characters (-, )
                      const allowedValue = e.target.value.replace(/[^0-9()\-]/g, '');
                      field.onChange(allowedValue);
                    }}
                    className={cn(
                      "text-xs",
                      isEditMode && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-gray-600"
                    )}
                    readOnly={isEditMode}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 1.5: Vehicle Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="vehiclePlateNo"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Vehicle Plate No.</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter vehicle plate no." 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleMCPlateNo"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Vehicle MC Plate No.</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter motorcycle plate no." 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleChassisNo"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Vehicle Chassis No.</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter chassis no." 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Suspect, Incident Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="suspect"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Suspect</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter suspect name" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="incidentType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Incident Type</FormLabel>
                {!showIncidentTypeInput ? (
                  <Select onValueChange={handleIncidentTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incidentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      placeholder="Enter custom incident type"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="text-xs"
                      autoFocus
                    />
                  </FormControl>
                )}
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Offense, Offense Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="offense"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Offense</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter offense" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="offenseType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Offense Type</FormLabel>
                {!showOffenseTypeInput ? (
                  <Select onValueChange={handleOffenseTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select offense type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {offenseTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      placeholder="Enter custom offense type"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      className="text-xs"
                      autoFocus
                    />
                  </FormControl>
                )}
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 4: Stage of Felony, Case Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="stageOfFelony"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Stage of Felony</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter stage of felony" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="caseStatus"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Case Status</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter case status" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>


        {/* Row 6: Region, Province */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Region</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    value={field.value || "REGION 11"}
                    readOnly
                    className={cn(
                      "text-xs",
                      "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-gray-600"
                    )}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Province</FormLabel>
                <FormControl>
                  <Input 
                    {...field}
                    value={field.value || "DAVAO ORIENTAL"}
                    readOnly
                    className={cn(
                      "text-xs",
                      "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-gray-600"
                    )}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 7: Municipality, Barangay */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="municipality"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Municipality</FormLabel>
                <Select onValueChange={handleMunicipalityChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select municipality" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {municipalities.map((municipality) => (
                      <SelectItem key={municipality} value={municipality}>{municipality}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="barangay"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Barangay</FormLabel>
                <Select 
                  onValueChange={handleBarangayChange} 
                  value={field.value || ""}
                  disabled={!selectedMunicipality}
                >
                  <FormControl>
                    <SelectTrigger 
                      className={cn(
                        "text-xs",
                        !selectedMunicipality && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <SelectValue placeholder={selectedMunicipality ? "Select barangay" : "Select municipality first"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {barangays.map((barangay) => (
                      <SelectItem key={barangay} value={barangay}>{barangay}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 8: Street */}
        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="text-xs text-gray-600">Street</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter street" 
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  className="text-xs" 
                />
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Row 9: Latitude, Longitude */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Latitude</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="Enter latitude" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Longitude</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="Enter longitude" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="text-xs" 
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 10: Date Committed */}
        <FormField
          control={form.control}
          name="dateCommited"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="text-xs text-gray-600">Date Committed</FormLabel>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full text-left font-normal text-xs justify-start border border-gray-300 dark:border-[#424242] bg-white dark:bg-gray-800",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 space-y-2" align="start">
                    <DatePicker
                      fieldValue={field.value}
                      dateValue={(date) =>
                        form.setValue("dateCommited", date, { shouldValidate: true })
                      }
                      maxDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Row 11: Time Committed */}
        <FormField
          control={form.control}
          name="timeCommited"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="text-xs text-gray-600">Time Committed</FormLabel>
              <FormControl>
                <Input type="time" {...field} className="text-xs" />
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Row 12: Date Reported, Time Reported */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dateReported"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Date Reported</FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full text-left font-normal text-xs justify-start border border-gray-300 dark:border-[#424242] bg-white dark:bg-gray-800",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 opacity-50" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2 space-y-2" align="start">
                      <DatePicker
                        fieldValue={field.value}
                        dateValue={(date) =>
                          form.setValue("dateReported", date, { shouldValidate: true })
                        }
                        maxDate={new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timeReported"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Time Reported</FormLabel>
                <FormControl>
                  <Input type="time" {...field} className="text-xs" />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 13: Date Encoded */}
        <FormField
          control={form.control}
          name="dateEncoded"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="text-xs text-gray-600">Date Encoded</FormLabel>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full text-left font-normal text-xs justify-start border border-gray-300 dark:border-[#424242] bg-white dark:bg-gray-800",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 space-y-2" align="start">
                    <DatePicker
                      fieldValue={field.value}
                      dateValue={(date) =>
                        form.setValue("dateEncoded", date, { shouldValidate: true })
                      }
                      maxDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Row 14: Narrative */}
        <FormField
          control={form.control}
          name="narrative"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="text-xs text-gray-600">Narrative</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter narrative details about the incident..." 
                  className="resize-none text-xs border border-gray-300 dark:border-[#424242] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-red-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-red-500"
                  rows={4}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage className="text-xs text-red-400" />
            </FormItem>
          )}
        />

        {/* Removed duplicate buttons - using modal footer buttons instead */}
      </form>
    </Form>
  );
};

export default FormComponent; 