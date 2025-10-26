import React from "react";
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

const FormComponent = ({ form, onSubmit, submitting, isEditMode = false }) => {
  const navigate = useNavigate();

  return (
    <Form {...form}>
      <form id="accident-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Accident ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="accident_id"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Accident ID</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ACC-0001" 
                    {...field} 
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

        {/* Row 2: Plate No., Accident Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="plateNo"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Plate No.</FormLabel>
                <FormControl>
                  <Input placeholder="Enter vehicle plate number" {...field} className="text-xs" />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accident_date"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Accident Date</FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full text-left font-normal text-xs justify-start",
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
                          form.setValue("accident_date", date, { shouldValidate: true })
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

        {/* Row 3: Street, Barangay, Municipality */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Street</FormLabel>
                <FormControl>
                  <Input placeholder="Street" {...field} className="text-xs" />
                </FormControl>
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
                <FormControl>
                  <Input placeholder="Barangay" {...field} className="text-xs" />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="municipality"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Municipality</FormLabel>
                <FormControl>
                  <Input placeholder="Municipality" {...field} className="text-xs" />
                </FormControl>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 4: Vehicle Type, Severity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicle_type"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Vehicle Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="jeepney">Jeepney</SelectItem>
                    <SelectItem value="tricycle">Tricycle</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="text-xs text-gray-600">Severity</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="fatal">Fatal</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-400" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 5: Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="text-xs text-gray-600">Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter additional notes about the accident..." 
                  className="resize-none text-xs"
                  rows={3}
                  {...field} 
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