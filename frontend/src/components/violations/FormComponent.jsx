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

const FormComponent = ({ form, onSubmit, submitting, isEditMode = false }) => {
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [violationToRemove, setViolationToRemove] = useState(null);
  
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
      }
    }
  };

  const confirmRemoveViolation = () => {
    if (violationToRemove !== null) {
      const newViolations = violations.filter((_, i) => i !== violationToRemove);
      setViolations(newViolations);
      form.setValue("violations", newViolations);
    }
    setShowRemoveModal(false);
    setViolationToRemove(null);
  };

  const cancelRemoveViolation = () => {
    setShowRemoveModal(false);
    setViolationToRemove(null);
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
              return (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Violation ${index + 1}`}
                    value={violation || ""}
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
              );
            })}
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