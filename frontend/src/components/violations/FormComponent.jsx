import React, { useState, useEffect } from "react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import DatePicker from "@/components/calendar/DatePicker";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useWatch } from "react-hook-form";

const FormComponent = ({ form, onSubmit, submitting }) => {
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  
  // Watch the violationType to conditionally render fields
  const violationType = useWatch({
    control: form.control,
    name: "violationType",
    defaultValue: "confiscated"
  });

  // Initialize violations array if empty for all violation types
  useEffect(() => {
    if (violations.length === 0) {
      setViolations([""]);
      form.setValue("violations", [""]);
    }
  }, [violations.length, form]);

  const addViolation = () => {
    setViolations([...violations, ""]);
  };

  const removeViolation = (index) => {
    if (violations.length > 1) {
      const newViolations = violations.filter((_, i) => i !== index);
      setViolations(newViolations);
      form.setValue("violations", newViolations);
    }
  };

  const updateViolation = (index, value) => {
    const newViolations = [...violations];
    newViolations[index] = value;
    setViolations(newViolations);
    form.setValue("violations", newViolations);
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
                    className="text-xs"
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
                    className="text-xs"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* All Fields Available for All Violation Types */}
        {/* Apprehension Details Section */}
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
                      className="text-xs"
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
                      className="text-xs"
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
                      className="text-xs"
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
                      className="text-xs"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Violations Section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-600">Violation/s</label>
            {violations.map((violation, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Violation ${index + 1}`}
                  value={violation}
                  onChange={(e) => updateViolation(index, e.target.value)}
                  className="text-xs"
                />
                {violations.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeViolation(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addViolation}
              className="w-full text-xs"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Violation
            </Button>
          </div>
        </div>

        {/* License Type Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="licenseType"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="text-xs text-gray-600">License Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select license type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SP">SP (Student Permit)</SelectItem>
                      <SelectItem value="DL">DL (Driver's License)</SelectItem>
                      <SelectItem value="CL">CL (Commercial License)</SelectItem>
                      <SelectItem value="plate">Plate</SelectItem>
                      <SelectItem value="sp receipt">SP Receipt</SelectItem>
                      <SelectItem value="dl receipt">DL Receipt</SelectItem>
                      <SelectItem value="refuse to sur.">Refuse to Sur.</SelectItem>
                      <SelectItem value="dl tempor">DL Tempor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />
            <div></div>
          </div>
        </div>

        {/* Vehicle Details Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      className="text-xs"
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
                      className="text-xs"
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
                      className="text-xs"
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal text-xs",
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
                          dateValue={field.onChange}
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
    </Form>
  );
};

export default FormComponent;