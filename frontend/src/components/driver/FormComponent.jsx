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

const FormComponent = ({ onSubmit, form, submitting }) => {
  const navigate = useNavigate();
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <Label>Vehicle Information</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-x-3">
              <FormField
                control={form.control}
                name="plateNo"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
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
                        className={cn(
                          "border border-input focus:ring-0",
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
                name="ownerRepresentativeName"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.ownerRepresentativeName && "text-red-400"
                      )}
                    >
                      Owner/Representative Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "border border-input focus:ring-0",
                          form.formState.errors.ownerRepresentativeName && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <div className="lg:col-span-3"></div>
            </div>
          </div>
          <div>
            <Label>Personal Information</Label>

            <div className="grid md:grid-cols-2 lg:grid-cols-9 gap-x-3">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.birthDate && "text-red-400"
                      )}
                    >
                      Birthday
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
                  <FormItem className="lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.contactNumber && "text-red-400"
                      )}
                    >
                      Contact Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.contactNumber && "border-red-400"
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
                  <FormItem className="lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.emailAddress && "text-red-400"
                      )}
                    >
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.emailAddress && "border-red-400"
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
            <Label>Address</Label>
            <div className="mt-4">
              <HierarchicalLocationSelector 
                form={form}
                onLocationChange={(location) => {
                  // Optional: Handle location changes if needed
                  console.log("Location changed:", location);
                }}
              />
            </div>
          </div>
          <div>
            <Label>Driver's License Information</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-9 gap-x-3">
              <FormField
                control={form.control}
                name="hasDriversLicense"
                render={({ field }) => (
                  <FormItem className="lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
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
                            "text-muted-foreground",
                            form.formState.errors.hasDriversLicense && "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Choose option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
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
                  <FormItem className="lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.driversLicenseNumber && "text-red-400"
                      )}
                    >
                      Driver's License Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.driversLicenseNumber && "border-red-400"
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
