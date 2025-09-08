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
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* TOP NO. and Violation Type in the same row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="topNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TOP NO.</FormLabel>
              <FormControl>
                <Input placeholder="TOP-0001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
          <FormField
            control={form.control}
            name="violationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Violation Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select violation type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="confiscated">Confiscated</SelectItem>
                    <SelectItem value="alarm">Alarm</SelectItem>
                    <SelectItem value="impounded">Impounded</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* All Fields Available for All Violation Types */}
        {/* Apprehension Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Apprehension Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middleInitial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Initial</FormLabel>
                  <FormControl>
                    <Input placeholder="D" maxLength={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="suffix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suffix</FormLabel>
                  <FormControl>
                    <Input placeholder="Jr." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Violations Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Violations</h3>
          <div className="space-y-2">
            {violations.map((violation, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Violation ${index + 1}`}
                  value={violation}
                  onChange={(e) => updateViolation(index, e.target.value)}
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
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Violation
            </Button>
          </div>
        </div>

        {/* License Type Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">License Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="licenseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <div></div>
          </div>
        </div>

        {/* Vehicle Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Vehicle Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="plateNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate No.</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC-1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chassisNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chassis No. (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Chassis Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="engineNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engine No. (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Engine Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Apprehension Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Apprehension Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dateOfApprehension"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Apprehension</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
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
            <FormField
              control={form.control}
              name="apprehendingOfficer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apprehending Officer</FormLabel>
                  <FormControl>
                    <Input placeholder="Officer Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>


        <div className="space-x-2">
          <Button 
            type="submit" 
            disabled={submitting}
            onClick={() => {
              console.log("=== SUBMIT BUTTON CLICKED ===");
              console.log("Form state:", form.formState);
              console.log("Form errors:", form.formState.errors);
              console.log("Form values:", form.getValues());
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default FormComponent;