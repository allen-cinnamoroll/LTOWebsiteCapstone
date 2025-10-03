import React, { useState, useLayoutEffect } from "react";
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
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoaderCircle, CalendarIcon } from "lucide-react";
import { format, addMonths, setYear, setMonth } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DatePicker from "../calendar/DatePicker";
import HierarchicalLocationSelector from "../location/HierarchicalLocationSelector";
import { useNavigate } from "react-router-dom";

const FormComponent = ({ onSubmit, form, submitting, onCancel, isEditMode = false }) => {
  const navigate = useNavigate();
  return (
    <Form {...form}>
      <form id="driver-form" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Vehicle Information</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-3">
              <FormField
                control={form.control}
                name="plateNo"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.plateNo && "text-red-400"
                        )}
                      >
                      Plate No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        autoFocus={false}
                        placeholder="ABC-123, DEF-456"
                        value={Array.isArray(field.value) ? field.value.join(", ") : field.value || ""}
                        onChange={(e) => {
                          if (!isEditMode) {
                            const value = e.target.value.toUpperCase();
                            // Convert comma-separated string to array
                            const plateArray = value.split(",").map(plate => plate.trim()).filter(plate => plate.length > 0);
                            field.onChange(plateArray.length > 0 ? plateArray : value);
                          }
                        }}
                        disabled={isEditMode}
                        className={cn(
                          "border border-input focus:ring-0 text-black dark:text-white",
                          form.formState.errors.plateNo && "border-red-400",
                          isEditMode && "bg-gray-100 cursor-not-allowed text-[8px]"
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
                  <FormItem className="space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.fileNo && "text-red-400"
                        )}
                      >
                      File No.
                    </FormLabel>
                    <FormControl className="mt-0">
                      <Input
                        {...field}
                        type="text"
                        autoFocus={false}
                        onChange={(e) => {
                          if (!isEditMode) {
                            const capitalizedValue = e.target.value.toUpperCase();
                            field.onChange(capitalizedValue);
                          }
                        }}
                        disabled={isEditMode}
                        className={cn(
                          "border border-input focus:ring-0 text-black dark:text-white",
                          form.formState.errors.fileNo && "border-red-400",
                          isEditMode && "bg-gray-100 cursor-not-allowed text-[8px]"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ownerRepresentativeName"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.ownerRepresentativeName && "text-red-400"
                        )}
                      >
                      Owner's Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        autoFocus={false}
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "border border-input focus:ring-0 text-black dark:text-white",
                          form.formState.errors.ownerRepresentativeName && "border-red-400",
                          isEditMode && "text-[8px]"
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
            <div className="grid md:grid-cols-2 lg:grid-cols-9 gap-x-3">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.birthDate && "text-red-400"
                        )}
                      >
                      Birthday (Optional)
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full text-left font-normal justify-start",
                              !field.value && "text-muted-foreground",
                              form.formState.errors.birthDate &&
                                "border-red-400"
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

                      <PopoverContent
                        className="w-auto p-2 space-y-2"
                        align="start"
                      >
                        <DatePicker
                          fieldValue={field.value}
                          dateValue={(date) =>
                            form.setValue("birthDate", date, {
                              shouldValidate: true,
                            })
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.contactNumber && "text-red-400"
                        )}
                      >
                      Contact Number (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        autoFocus={false}
                        className={cn(
                          "text-black dark:text-white",
                          form.formState.errors.contactNumber && "border-red-400",
                          isEditMode && "text-[8px]"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emailAddress"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.emailAddress && "text-red-400"
                        )}
                      >
                      Email Address (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoFocus={false}
                        className={cn(
                          "text-black dark:text-white",
                          form.formState.errors.emailAddress && "border-red-400",
                          isEditMode && "text-[8px]"
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
            <div className="mt-4">
              <HierarchicalLocationSelector 
                form={form}
                isEditMode={isEditMode}
                onLocationChange={(location) => {
                  // Optional: Handle location changes if needed
                  console.log("Location changed:", location);
                }}
              />
            </div>
          </div>
          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-9 gap-x-3">
              <FormField
                control={form.control}
                name="hasDriversLicense"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs",
                          form.formState.errors.hasDriversLicense && "text-red-400"
                        )}
                      >
                      Do you have Driver's License?
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "true")}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-black dark:text-white",
                            form.formState.errors.hasDriversLicense && "border-red-400",
                            isEditMode && "text-xs"
                          )}
                        >
                          <SelectValue placeholder="Choose option" className={isEditMode ? "text-xs" : ""} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={isEditMode ? "text-xs" : ""}>
                        <SelectGroup>
                          <SelectItem value="true" className={isEditMode ? "text-xs" : ""}>Yes</SelectItem>
                          <SelectItem value="false" className={isEditMode ? "text-xs" : ""}>No</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driversLicenseNumber"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3 space-y-0">
                      <FormLabel
                        className={cn(
                          "text-muted-foreground text-xs mb-0",
                          form.formState.errors.driversLicenseNumber && "text-red-400"
                        )}
                      >
                      Driver's License Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        autoFocus={false}
                        onChange={(e) => {
                          const capitalizedValue = e.target.value.toUpperCase();
                          field.onChange(capitalizedValue);
                        }}
                        className={cn(
                          "text-black dark:text-white",
                          form.formState.errors.driversLicenseNumber && "border-red-400",
                          isEditMode && "text-[8px]"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <div className="lg:col-span-6"></div>
            </div>
          </div>
          {/* Buttons removed - using modal footer buttons instead */}
        </div>
      </form>
    </Form>
  );
};

export default FormComponent;
