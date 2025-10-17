import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircle, CalendarIcon, Search, X, Edit3 } from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DatePicker from "@/components/calendar/DatePicker";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import AddDriverModal from "@/components/driver/AddDriverModal";

const FormComponent = ({ onSubmit, form, submitting, hideDateOfRenewal = false, isEditMode = false, readOnlyFields = [], prePopulatedOwner = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showNoResults, setShowNoResults] = useState(false);
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false);
  const [isOwnerEditable, setIsOwnerEditable] = useState(false);
  const searchInputRef = useRef(null);

  // Set pre-populated owner name in edit mode
  useEffect(() => {
    if (isEditMode && prePopulatedOwner) {
      setSearchTerm(prePopulatedOwner);
    }
  }, [isEditMode, prePopulatedOwner]);

  // Search drivers when search term changes
  useEffect(() => {
    const searchDrivers = async () => {
      if (searchTerm.length >= 2 && isOwnerEditable) {
        setIsSearching(true);
        setShowNoResults(false);
        try {
          const { data } = await apiClient.get(`/driver/search?name=${encodeURIComponent(searchTerm)}`, {
            headers: { Authorization: token }
          });
          if (data.success) {
            // Debug: Log the search results to see what data is being received
            console.log('Driver search results:', data.data);
            console.log('First driver address:', data.data[0]?.address);
            console.log('Municipality:', data.data[0]?.address?.municipality);
            console.log('Barangay:', data.data[0]?.address?.barangay);
            setSearchResults(data.data);
            // Show "no results" option if no drivers found and search term is long enough
            if (data.data.length === 0 && searchTerm.length >= 3) {
              setShowNoResults(true);
            }
          }
        } catch (error) {
          console.error("Error searching drivers:", error);
          setSearchResults([]);
          if (searchTerm.length >= 3) {
            setShowNoResults(true);
          }
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowNoResults(false);
      }
    };

    const timeoutId = setTimeout(searchDrivers, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, token, isOwnerEditable]);

  // Auto-scroll to search section when dropdown appears
  useEffect(() => {
    if (searchResults.length > 0 || showNoResults) {
      // Use a small delay to ensure the dropdown has rendered
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

  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
    form.setValue("driver", driver._id);
    setSearchTerm(driver.ownerRepresentativeName);
    setSearchResults([]);
    setShowNoResults(false); // Hide "Add new driver" option when driver is selected
    setIsOwnerEditable(false); // Return to read-only state after selection
  };

  const handleClearDriver = () => {
    setSelectedDriver(null);
    form.setValue("driver", null);
    setSearchTerm("");
    setSearchResults([]);
    setShowNoResults(false);
    setIsOwnerEditable(false);
  };

  const handleAddDriver = () => {
    // Get current vehicle form data
    const currentFormData = form.getValues();
    
    // Store vehicle data in sessionStorage to pass to driver form
    sessionStorage.setItem('vehicleFormData', JSON.stringify({
      plateNo: currentFormData.plateNo || '',
      fileNo: currentFormData.fileNo || '',
      ownerRepresentativeName: currentFormData.ownerRepresentativeName || searchTerm || ''
    }));
    
    // Open the add driver modal
    setAddDriverModalOpen(true);
  };

  const handleDriverAdded = (newDriver) => {
    // Set the newly created driver as selected
    setSelectedDriver(newDriver);
    form.setValue("driver", newDriver._id);
    setSearchTerm(newDriver.ownerRepresentativeName);
    setSearchResults([]);
    setShowNoResults(false); // Hide the "Add new driver" option
    setAddDriverModalOpen(false);
    setIsOwnerEditable(false); // Return to read-only state after selection
    
    toast.success("Driver added successfully", {
      description: "The driver has been selected for this vehicle."
    });
  };


  return (
    <Form {...form}>
      <form id="vehicle-form" onSubmit={form.handleSubmit((data) => {
        // Debug: Log the selectedDriver and form data
        console.log('Selected driver:', selectedDriver);
        console.log('Form data:', data);
        
        // Include the owner's name in the form data
        // Try to get the owner name from selectedDriver, searchTerm, or fallback
        const ownerName = selectedDriver?.ownerRepresentativeName || 
                         (searchTerm && searchTerm !== '' ? searchTerm : 'Not selected');
        
        const formDataWithOwner = {
          ...data,
          ownerName: ownerName
        };
        console.log('Form data with owner:', formDataWithOwner);
        onSubmit(formDataWithOwner);
      })}>
        <div className="space-y-3">
          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="plateNo"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.plateNo && "text-red-400"
                      )}
                    >
                      Plate No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="ABC-123"
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.plateNo && "border-red-400"
                        )}
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
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.fileNo && "text-red-400"
                      )}
                    >
                      File No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        readOnly={isEditMode && readOnlyFields.includes('fileNo')}
                        onChange={(e) => {
                          if (!(isEditMode && readOnlyFields.includes('fileNo'))) {
                            const capitalizedValue = e.target.value.toUpperCase();
                            field.onChange(capitalizedValue);
                          }
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.fileNo && "border-red-400",
                          isEditMode && readOnlyFields.includes('fileNo') && "bg-gray-200 text-gray-600 cursor-not-allowed border-gray-300"
                        )}
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
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.engineNo && "text-red-400"
                      )}
                    >
                      Engine No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.engineNo && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="chassisNo"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.chassisNo && "text-red-400"
                      )}
                    >
                      Chassis No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.chassisNo && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.make && "text-red-400"
                      )}
                    >
                      Make
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.make && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bodyType"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.bodyType && "text-red-400"
                      )}
                    >
                      Body Type
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.bodyType && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.color && "text-red-400"
                      )}
                    >
                      Color
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.color && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classification"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.classification && "text-red-400"
                      )}
                    >
                      Classification
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-black dark:text-white text-sm",
                            form.formState.errors.classification && "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Classifications</SelectLabel>
                          <SelectItem value="Private">PRIVATE</SelectItem>
                          <SelectItem value="For Hire">FOR HIRE</SelectItem>
                          <SelectItem value="Government">GOVERNMENT</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vehicleStatusType"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground mb-0",
                        form.formState.errors.vehicleStatusType && "text-red-400"
                      )}
                    >
                      Vehicle Status Type
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-black dark:text-white text-sm",
                            form.formState.errors.vehicleStatusType && "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Select vehicle status type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Vehicle Status</SelectLabel>
                          <SelectItem value="New">New Vehicle</SelectItem>
                          <SelectItem value="Old">Old Vehicle</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              {!hideDateOfRenewal && (
                <FormField
                  control={form.control}
                  name="dateOfRenewal"
                  render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground mb-0",
                          form.formState.errors.dateOfRenewal && "text-red-400"
                        )}
                      >
                        Date of Renewal
                      </FormLabel>
                      {isEditMode && readOnlyFields.includes('dateOfRenewal') ? (
                        <Input
                          value={field.value ? format(field.value, "PPP") : "Not set"}
                          readOnly
                          className="bg-gray-200 text-gray-600 cursor-not-allowed border-gray-300 text-sm"
                        />
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal text-black dark:text-white text-sm",
                                !field.value && "text-muted-foreground",
                                form.formState.errors.dateOfRenewal && "border-red-400"
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
                              dateValue={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Driver/Owner Search Section */}
          <div>
            <Label>Driver/Owner Information</Label>
            <div className="mt-1">
              <FormField
                control={form.control}
                name="driver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground mb-0">
                      Search and Select Driver/Owner
                    </FormLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      Format: Surname Suffix (Optional), FirstName, Middle Initial
                    </p>
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            ref={searchInputRef}
                            placeholder="Type driver/owner name to search..."
                            value={searchTerm}
                            onChange={(e) => {
                              const capitalizedValue = e.target.value.toUpperCase();
                              setSearchTerm(capitalizedValue);
                              // Automatically make the field editable when user starts typing
                              if (!isOwnerEditable) {
                                setIsOwnerEditable(true);
                              }
                            }}
                            onFocus={() => {
                              // Make the field editable when focused
                              if (!isOwnerEditable) {
                                setIsOwnerEditable(true);
                              }
                            }}
                            className={cn(
                              "pr-10 text-sm",
                              isEditMode && !isOwnerEditable && "bg-gray-200"
                            )}
                            readOnly={isEditMode && !isOwnerEditable}
                          />
                          {isSearching && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!isSearching && isEditMode && !isOwnerEditable && (
                            <button
                              type="button"
                              onClick={() => setIsOwnerEditable(true)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          {!isSearching && searchTerm && isOwnerEditable && (
                            <button
                              type="button"
                              onClick={handleClearDriver}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Search Results Dropdown */}
                      {(searchResults.length > 0 || showNoResults) && isOwnerEditable && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                          {searchResults.map((driver) => (
                            <div
                              key={driver._id}
                              className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0 transition-colors"
                              onClick={() => handleDriverSelect(driver)}
                            >
                              <div className="text-sm font-medium text-foreground">{driver.ownerRepresentativeName}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Current vehicles: {driver.plateNo || "None"}
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Driver Option - only show when no results and not already selected */}
                          {showNoResults && searchResults.length === 0 && !selectedDriver && (
                            <div
                              className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0 bg-accent/50 transition-colors"
                              onClick={handleAddDriver}
                            >
                              <div className="text-sm font-medium text-primary">
                                + Add "{searchTerm}" as new driver
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Click to create a new driver record
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Driver Display */}
                      {selectedDriver && !isOwnerEditable && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-green-800">
                                Selected: {selectedDriver.ownerRepresentativeName}
                              </div>
                              <div className="text-xs text-green-600">
                                Current vehicles: {selectedDriver.plateNo || "None"}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOwnerEditable(true)}
                                className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClearDriver}
                                className="text-green-600 hover:text-green-800 h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
            </div>
          </div>


          {/* Removed duplicate buttons - using modal footer buttons instead */}
        </div>
      </form>
      
      {/* Add Driver Modal */}
      <AddDriverModal
        open={addDriverModalOpen}
        onOpenChange={setAddDriverModalOpen}
        onDriverAdded={handleDriverAdded}
      />
    </Form>
  );
};

export default FormComponent;