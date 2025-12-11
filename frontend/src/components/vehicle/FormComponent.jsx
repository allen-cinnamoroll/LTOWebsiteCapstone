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
import { LoaderCircle, CalendarIcon, Search, X, Edit3, Eye } from "lucide-react";
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
import DriverModal from "@/components/driver/DriverModal";
import VehicleModal from "@/components/vehicle/VehicleModal";

const FormComponent = ({ onSubmit, form, submitting, hideDateOfRenewal = false, isEditMode = false, readOnlyFields = [], prePopulatedOwner = "", onAddNewOwner }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showNoResults, setShowNoResults] = useState(false);
  const [isOwnerEditable, setIsOwnerEditable] = useState(false);
  const [ownerDetailsModalOpen, setOwnerDetailsModalOpen] = useState(false);
  const [ownerDetailsData, setOwnerDetailsData] = useState(null);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [selectedFileNumber, setSelectedFileNumber] = useState("");
  const searchInputRef = useRef(null);
  const lastFetchedOwnerIdRef = useRef(null);
  const isFetchingOwnerRef = useRef(false);

  // Set pre-populated owner name in edit mode
  useEffect(() => {
    if (isEditMode && prePopulatedOwner && prePopulatedOwner.trim() !== '') {
      setSearchTerm(prePopulatedOwner);
      // If we have a pre-populated owner, set it as selected owner
      if (prePopulatedOwner && prePopulatedOwner !== 'Not selected') {
        setSelectedDriver({
          _id: form.getValues('driver') || '',
          ownerRepresentativeName: prePopulatedOwner
        });
      }
    }
  }, [isEditMode, prePopulatedOwner, form]);

  // Clear selected driver when search term changes and doesn't match selected driver
  useEffect(() => {
    if (isOwnerEditable && selectedDriver) {
      const selectedName = selectedDriver.ownerRepresentativeName?.toUpperCase() || '';
      const currentSearchTerm = searchTerm.toUpperCase();
      // If search term doesn't match selected driver's name, clear the selection
      if (currentSearchTerm !== selectedName && currentSearchTerm.length > 0) {
        setSelectedDriver(null);
        form.setValue("driver", null);
      }
    }
  }, [searchTerm, isOwnerEditable, selectedDriver, form]);

  // Search owners when search term changes
  useEffect(() => {
    const searchOwners = async () => {
      if (searchTerm.length >= 2 && isOwnerEditable) {
        setIsSearching(true);
        setShowNoResults(false);
        try {
          const { data } = await apiClient.get(`/owner/search?name=${encodeURIComponent(searchTerm)}`, {
            headers: { Authorization: token }
          });
          if (data.success) {
            setSearchResults(data.data);
            // Show "no results" option if no owners found and search term is long enough
            if (data.data.length === 0 && searchTerm.length >= 3) {
              setShowNoResults(true);
            }
          }
        } catch (error) {
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

    const timeoutId = setTimeout(searchOwners, 300); // Debounce search
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
    setShowNoResults(false); // Hide "Add new owner" option when owner is selected
    setIsOwnerEditable(false); // Return to read-only state after selection
  };

  const handleViewOwner = async (driver) => {
    try {
      setOwnerDetailsData(null);
      setOwnerDetailsModalOpen(true);

      const { data } = await apiClient.get(`/owner/${driver._id}`, {
        headers: { Authorization: token },
      });

      if (data.success && data.data) {
        setOwnerDetailsData(data.data);
      } else {
        setOwnerDetailsModalOpen(false);
        toast.error("Failed to load owner details");
      }
    } catch (error) {
      console.error("Failed to load owner details from search:", error);
      setOwnerDetailsModalOpen(false);
      toast.error("Failed to load owner details");
    }
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
    
    // Store vehicle data in sessionStorage to pass to owner form
    sessionStorage.setItem('vehicleFormData', JSON.stringify({
      plateNo: currentFormData.plateNo || '',
      fileNo: currentFormData.fileNo || '',
      ownerRepresentativeName: currentFormData.ownerRepresentativeName || searchTerm || ''
    }));
    
    // Call parent callback to open Add Owner modal (which will close Add Vehicle modal)
    if (onAddNewOwner) {
      onAddNewOwner();
    }
  };
  
  // Watch for driver field changes (e.g., when owner is created externally)
  // and fetch owner details to display the name
  useEffect(() => {
    const fetchOwnerDetails = async (ownerId) => {
      // Prevent duplicate fetches
      if (isFetchingOwnerRef.current || lastFetchedOwnerIdRef.current === ownerId) {
        return;
      }
      
      isFetchingOwnerRef.current = true;
      lastFetchedOwnerIdRef.current = ownerId;
      
      try {
        const { data } = await apiClient.get(`/owner/${ownerId}`, {
          headers: { Authorization: token }
        });
        if (data.success && data.data) {
          const owner = data.data;
          setSelectedDriver(owner);
          setSearchTerm(owner.ownerRepresentativeName || "");
          setSearchResults([]);
          setShowNoResults(false);
          setIsOwnerEditable(false);
        }
      } catch (error) {
        console.error("Failed to fetch owner details:", error);
        lastFetchedOwnerIdRef.current = null; // Reset on error to allow retry
      } finally {
        isFetchingOwnerRef.current = false;
      }
    };

    const subscription = form.watch((value, { name }) => {
      // When driver field changes, fetch owner details if needed
      if (name === "driver" || name === undefined) {
        const ownerId = value.driver || form.getValues("driver");
        const currentSelectedDriverId = selectedDriver?._id || selectedDriver?.id;
        
        // Fetch owner details if:
        // 1. We have an ownerId but no selectedDriver, OR
        // 2. The ownerId has changed (different from currently selected driver AND different from last fetched)
        if (ownerId && ownerId !== lastFetchedOwnerIdRef.current && 
            (!selectedDriver || currentSelectedDriverId !== ownerId)) {
          fetchOwnerDetails(ownerId);
        }
      }
    });
    
    // Also check immediately when component mounts or form is reset
    const ownerId = form.getValues("driver");
    const currentSelectedDriverId = selectedDriver?._id || selectedDriver?.id;
    
    if (ownerId && ownerId !== lastFetchedOwnerIdRef.current && 
        (!selectedDriver || currentSelectedDriverId !== ownerId)) {
      fetchOwnerDetails(ownerId);
    }
    
    return () => subscription.unsubscribe();
  }, [form, selectedDriver, token]);


  return (
    <Form {...form}>
      <form id="vehicle-form" onSubmit={form.handleSubmit((data) => {
        // Handle owner field properly for edit mode
        let ownerId = data.driver;
        if (isEditMode && !isOwnerEditable && !selectedDriver) {
          // If in edit mode and owner field is not editable, keep the original owner
          ownerId = data.driver || form.getValues('driver');
        } else if (selectedDriver) {
          // If a new owner is selected, use their ID
          ownerId = selectedDriver._id;
        } else if (isEditMode && prePopulatedOwner && prePopulatedOwner !== 'No owner assigned') {
          // If we have a pre-populated owner, preserve the existing owner ID
          ownerId = form.getValues('driver') || data.driver;
        }
        
        // Include the owner's name in the form data
        const ownerName = selectedDriver?.ownerRepresentativeName || 
                         (searchTerm && searchTerm !== '' ? searchTerm : prePopulatedOwner || 'Not selected');
        
        const formDataWithOwner = {
          ...data,
          driver: ownerId,
          ownerName: ownerName
        };
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
                          // Only allow letters and numbers (no symbols)
                          const filteredValue = e.target.value.replace(/[^A-Za-z0-9]/g, '');
                          const capitalizedValue = filteredValue.toUpperCase();
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
                            // Only allow numbers and '-' symbol (no letters)
                            const filteredValue = e.target.value.replace(/[^0-9-]/g, '');
                            field.onChange(filteredValue);
                          }
                        }}
                        className={cn(
                          "text-black dark:text-white text-sm",
                          form.formState.errors.fileNo && "border-red-400",
                          isEditMode && readOnlyFields.includes('fileNo') && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-[#424242]"
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
                            "text-black dark:text-white text-sm border border-gray-300 dark:border-[#424242]",
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
                            "text-black dark:text-white text-sm border border-gray-300 dark:border-[#424242]",
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
                          className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-[#424242] text-sm"
                        />
                      ) : (
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
                                form.setValue("dateOfRenewal", date, { shouldValidate: true })
                              }
                              maxDate={new Date()}
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

          {/* Owner Search Section */}
          <div>
            <Label>Owner Information</Label>
            <div className="mt-1">
              <FormField
                control={form.control}
                name="driver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground mb-0">
                      Search and Select Owner
                    </FormLabel>
                    <p className="text-xs text-gray-500 mb-2">
                      Format: Surname Suffix (Optional), FirstName, Middle Initial
                    </p>
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            ref={searchInputRef}
                            placeholder="Type owner name to search..."
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
                              isEditMode && !isOwnerEditable && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed border-gray-300 dark:border-[#424242]"
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
                              className="p-3 hover:bg-accent border-b border-border last:border-b-0 transition-colors flex items-center justify-between"
                            >
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => handleDriverSelect(driver)}
                              >
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{driver.ownerRepresentativeName}</div>
                                {/* Removed 'Current vehicles' line as requested */}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewOwner(driver);
                                }}
                                className="ml-2 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          
                          {/* Add Owner Option - only show when no results and not already selected */}
                          {showNoResults && searchResults.length === 0 && (() => {
                            // Check if search term matches selected driver name
                            const selectedName = selectedDriver?.ownerRepresentativeName?.toUpperCase() || '';
                            const currentSearchTerm = searchTerm.toUpperCase();
                            const nameMatches = selectedName && currentSearchTerm === selectedName;
                            
                            // In edit mode: show message if no results (unless name exactly matches)
                            // In add mode: show message only if no selectedDriver
                            const shouldShowInEditMode = isEditMode && !nameMatches;
                            const shouldShowInAddMode = !isEditMode && !selectedDriver;
                            
                            if (shouldShowInEditMode || shouldShowInAddMode) {
                              return (
                                <div className="border-b border-border last:border-b-0">
                                  {isEditMode ? (
                                    <div className="p-3">
                                      <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                        Name not found click the new owner button to add a new owner
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="p-3 hover:bg-accent cursor-pointer bg-accent/50 transition-colors"
                                      onClick={handleAddDriver}
                                    >
                                      <div className="text-sm font-medium text-primary">
                                        + Add "{searchTerm}" as new owner
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Click to create a new owner record
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Selected Owner Display */}
                      {selectedDriver && !isOwnerEditable && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-[#18181B] border border-green-200 dark:border-[#424242] rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-green-800 dark:text-gray-200">
                                Selected: <span className="dark:text-white dark:font-semibold">{selectedDriver.ownerRepresentativeName}</span>
                              </div>
                              {/* Removed 'Current vehicles' line in selected owner display */}
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
      
      {/* Owner Details / Profile Modal (reuses main Owner profile view) */}
      <DriverModal
        open={ownerDetailsModalOpen}
        onOpenChange={setOwnerDetailsModalOpen}
        driverData={ownerDetailsData}
        onFileNumberClick={(fileNo) => {
          setSelectedFileNumber(fileNo);
          setVehicleModalOpen(true);
        }}
      />

      {/* Vehicle Information Modal (reused design) */}
      <VehicleModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        fileNumber={selectedFileNumber}
      />
    </Form>
  );
};

export default FormComponent;