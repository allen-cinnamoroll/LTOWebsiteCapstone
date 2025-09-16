import React, { useState, useEffect } from "react";
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
import { LoaderCircle, CalendarIcon, Search, X } from "lucide-react";
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

const FormComponent = ({ onSubmit, form, submitting, hideDateOfRenewal = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showNoResults, setShowNoResults] = useState(false);

  // Search drivers when search term changes
  useEffect(() => {
    const searchDrivers = async () => {
      if (searchTerm.length >= 2) {
        setIsSearching(true);
        setShowNoResults(false);
        try {
          const { data } = await apiClient.get(`/driver/search?name=${encodeURIComponent(searchTerm)}`, {
            headers: { Authorization: token }
          });
          if (data.success) {
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
  }, [searchTerm, token]);

  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
    form.setValue("driver", driver._id);
    setSearchTerm(driver.ownerRepresentativeName);
    setSearchResults([]);
  };

  const handleClearDriver = () => {
    setSelectedDriver(null);
    form.setValue("driver", null);
    setSearchTerm("");
    setSearchResults([]);
    setShowNoResults(false);
  };

  const handleAddDriver = () => {
    // Store the current vehicle form data and search term in sessionStorage
    const currentFormData = form.getValues();
    sessionStorage.setItem('vehicleFormData', JSON.stringify(currentFormData));
    sessionStorage.setItem('driverSearchTerm', searchTerm);
    sessionStorage.setItem('returnToVehicleForm', 'true');
    
    // Navigate to add driver form
    navigate('/driver/create');
  };

  // Restore form data when returning from driver form
  useEffect(() => {
    const returnToVehicleForm = sessionStorage.getItem('returnToVehicleForm');
    if (returnToVehicleForm === 'true') {
      const savedFormData = sessionStorage.getItem('vehicleFormData');
      const savedSearchTerm = sessionStorage.getItem('driverSearchTerm');
      const newDriverId = sessionStorage.getItem('newDriverId');
      const newDriverName = sessionStorage.getItem('newDriverName');
      
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);
        // Restore form values
        Object.keys(formData).forEach(key => {
          if (formData[key] !== undefined && formData[key] !== null) {
            form.setValue(key, formData[key]);
          }
        });
      }
      
      if (savedSearchTerm) {
        setSearchTerm(savedSearchTerm);
      }
      
      // If a new driver was created, set it as selected
      if (newDriverId && newDriverName) {
        form.setValue('driver', newDriverId);
        setSearchTerm(newDriverName);
        setSelectedDriver({
          _id: newDriverId,
          ownerRepresentativeName: newDriverName
        });
        
        // Show a message that driver was created but vehicle creation failed
        toast.info("Driver was created successfully. Please complete the vehicle registration.", {
          description: "The driver has been added to your system. Fill in the remaining vehicle details and submit."
        });
      }
      
      // Clear the session storage
      sessionStorage.removeItem('vehicleFormData');
      sessionStorage.removeItem('driverSearchTerm');
      sessionStorage.removeItem('returnToVehicleForm');
      sessionStorage.removeItem('newDriverId');
      sessionStorage.removeItem('newDriverName');
    }
  }, [form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <Label>Vehicle Information</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="plateNo"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
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
                        className={cn(
                          "text-muted-foreground",
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
                        "text-muted-foreground",
                        form.formState.errors.fileNo && "text-red-400"
                      )}
                    >
                      File No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.fileNo && "border-red-400"
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
                        "text-muted-foreground",
                        form.formState.errors.engineNo && "text-red-400"
                      )}
                    >
                      Engine No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
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
            <Label>Vehicle Details</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="chassisNo"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.chassisNo && "text-red-400"
                      )}
                    >
                      Chassis No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
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
                        "text-muted-foreground",
                        form.formState.errors.make && "text-red-400"
                      )}
                    >
                      Make
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
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
                        "text-muted-foreground",
                        form.formState.errors.bodyType && "text-red-400"
                      )}
                    >
                      Body Type
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
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
            <Label>Vehicle Specifications</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.color && "text-red-400"
                      )}
                    >
                      Color
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
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
                        "text-muted-foreground",
                        form.formState.errors.classification && "text-red-400"
                      )}
                    >
                      Classification
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-muted-foreground",
                            form.formState.errors.classification && "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Classifications</SelectLabel>
                          <SelectItem value="Private">Private</SelectItem>
                          <SelectItem value="For Hire">For Hire</SelectItem>
                          <SelectItem value="Government">Government</SelectItem>
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
                          "text-muted-foreground",
                          form.formState.errors.dateOfRenewal && "text-red-400"
                        )}
                      >
                        Date of Renewal (Optional)
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal text-muted-foreground",
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
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>

          {/* Driver/Owner Search Section */}
          <div>
            <Label>Driver/Owner Information (Optional)</Label>
            <div className="mt-2">
              <FormField
                control={form.control}
                name="driver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">
                      Search and Select Driver/Owner
                    </FormLabel>
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Type driver/owner name to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10"
                          />
                          {isSearching && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!isSearching && searchTerm && (
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
                      {(searchResults.length > 0 || showNoResults) && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.map((driver) => (
                            <div
                              key={driver._id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleDriverSelect(driver)}
                            >
                              <div className="font-medium">{driver.ownerRepresentativeName}</div>
                              <div className="text-sm text-muted-foreground">
                                Birthdate: {driver.birthDate ? new Date(driver.birthDate).toLocaleDateString() : "Not provided"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Current vehicles: {driver.plateNo || "None"}
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Driver Option */}
                          {showNoResults && searchResults.length === 0 && (
                            <div
                              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 bg-blue-25"
                              onClick={handleAddDriver}
                            >
                              <div className="font-medium text-blue-600">
                                + Add "{searchTerm}" as new driver
                              </div>
                              <div className="text-sm text-blue-500">
                                Click to create a new driver record
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Driver Display */}
                      {selectedDriver && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-green-800">
                                Selected: {selectedDriver.ownerRepresentativeName}
                              </div>
                              <div className="text-sm text-green-600">
                                Birthdate: {selectedDriver.birthDate ? new Date(selectedDriver.birthDate).toLocaleDateString() : "Not provided"}
                              </div>
                              <div className="text-sm text-green-600">
                                Current vehicles: {selectedDriver.plateNo || "None"}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleClearDriver}
                              className="text-green-600 hover:text-green-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
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


          <div className="space-x-2">
            <Button disabled={submitting} id="submit" className="w-20">
              {submitting ? (
                <LoaderCircle className="w-6 h-6 text-primary-foreground mx-auto animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default FormComponent;