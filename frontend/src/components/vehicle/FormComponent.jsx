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
import { LoaderCircle, CalendarIcon } from "lucide-react";
import { format, addMonths, setYear, setMonth } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DatePicker from "@/components/calendar/DatePicker";
import { useNavigate } from "react-router-dom";

const FormComponent = ({ onSubmit, form, submitting }) => {
  const navigate = useNavigate();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div>
            <Label>Owner Personal Information</Label>

            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.firstName && "text-red-400"
                      )}
                    >
                      Firstname
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "border border-input focus:ring-0",
                          form.formState.errors.firstName && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel className="text-muted-foreground">
                      Middlename
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="text" />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem className=" lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.lastName && "text-red-400"
                      )}
                    >
                      Lastname
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.lastName && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem className="col-span-1 lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.street && "text-red-400"
                      )}
                    >
                      Street
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.street && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="barangay"
                render={({ field }) => (
                  <FormItem className="col-span-1 lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.barangay && "text-red-400"
                      )}
                    >
                      Barangay
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.barangay && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem className="col-span-1 lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.municipality && "text-red-400"
                      )}
                    >
                      Municipality
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.municipality && "border-red-400"
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
                  <FormItem className="col-span-1 md:col-span-2 lg:col-span-3">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.province && "text-red-400"
                      )}
                    >
                      Province
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.province && "border-red-400"
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
            <Label>Documentation</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="encumbrance"
                render={({ field }) => (
                  <FormItem className="">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.encumbrance && "text-red-400"
                      )}
                    >
                      Encumbrance
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.encumbrance && "border-red-400"
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
                  <FormItem className="">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.fileNo && "text-red-400"
                      )}
                    >
                      File No.
                      <span className="ml-2 text-xs">(For Hire Only)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        maxLength={15}
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
                name="vehicleType"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-1">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.vehicleType && "text-red-400"
                      )}
                    >
                      Vehicle Type
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "Other")
                          form.setValue("customVehicleType", ""); // Reset custom input
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-muted-foreground",
                            form.formState.errors.vehicleType &&
                              "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Choose vehicle type" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent className="">
                        <SelectGroup>
                          <SelectItem value="Car">Car</SelectItem>
                          <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                          <SelectItem value="2nd Hand">2nd Hand</SelectItem>
                          <SelectItem value="Rebuilt">Rebuilt</SelectItem>
                          <SelectItem value="Truck">Truck</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {field.value === "Other" && (
                      <FormField
                        control={form.control}
                        name="customVehicleType"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter vehicle type"
                                className="border-gray-300 focus:ring-blue-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
            </div>
          </div>
          <div>
            <Label>Identification</Label>
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
                      Plate No
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        maxLength={8}
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
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-muted-foreground",
                            form.formState.errors.classification &&
                              "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Choose classification" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent className="">
                        <SelectGroup>
                          {/* <SelectLabel>Sex</SelectLabel> */}
                          <SelectItem value="0">Private</SelectItem>
                          <SelectItem value="1">For Hire</SelectItem>
                          <SelectItem value="2">Government</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem className=" lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.fuelType && "text-red-400"
                      )}
                    >
                      Fuel Type
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "Other")
                          form.setValue("customFuelType", ""); // Reset custom input
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            "text-muted-foreground",
                            form.formState.errors.fuelType && "border-red-400"
                          )}
                        >
                          <SelectValue placeholder="Choose fuel type" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent className="">
                        <SelectGroup>
                          <SelectItem value="Gas">Gas</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="LPG">LPG</SelectItem>
                          <SelectItem value="Electric">Electric</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {field.value === "Other" && (
                      <FormField
                        control={form.control}
                        name="customFuelType"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter fuel type"
                                className="border-gray-300 focus:ring-blue-500"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

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
                name="series"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.series && "text-red-400"
                      )}
                    >
                      Series
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.series && "border-red-400"
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
              <FormField
                control={form.control}
                name="motorNumber"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.motorNumber && "text-red-400"
                      )}
                    >
                      Motor No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.motorNumber && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serialChassisNumber"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.serialChassisNumber &&
                          "text-red-400"
                      )}
                    >
                      Serial/Chassis No.
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.serialChassisNumber &&
                            "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
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
                name="yearModel"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.yearModel && "text-red-400"
                      )}
                    >
                      Year Model
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        className={cn(
                          "text-muted-foreground",
                          form.formState.errors.yearModel && "border-red-400"
                        )}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateRegistered"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.dateRegistered && "text-red-400"
                      )}
                    >
                      Date Registered
                    </FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full text-left font-normal justify-start",
                                !field.value && "text-muted-foreground",
                                form.formState.errors.dateRegistered &&
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
                              form.setValue("dateRegistered", date, {
                                shouldValidate: true,
                              })
                            }
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
                name="expirationDate"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel
                      className={cn(
                        "text-muted-foreground",
                        form.formState.errors.expirationDate && "text-red-400"
                      )}
                    >
                      Expiration Date
                    </FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full text-left font-normal justify-start",
                                !field.value && "text-muted-foreground",
                                form.formState.errors.expirationDate &&
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
                              form.setValue("expirationDate", date, {
                                shouldValidate: true,
                              })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
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
