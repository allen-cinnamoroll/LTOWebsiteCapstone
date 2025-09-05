import React from "react";
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
import { format } from "date-fns";
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
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
              <div className="lg:col-span-2"></div>
            </div>
          </div>

          <div>
            <Label>Registration Details</Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-3">
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
                      Date of Renewal
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
              <div className="lg:col-span-4"></div>
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