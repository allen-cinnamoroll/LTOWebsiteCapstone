import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoaderCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/util/dateFormatter";

const roleOptions = [
  { value: "1", label: "Admin" },
  { value: "2", label: "Employee" },
];

export default function RegisterAccountPage() {
  const { userData: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const date = formatDate(Date.now());

  // Create schema dynamically based on user role
  const registerAccountSchema = useMemo(() => z.object({
    firstName: z.string().min(1, "First name is required").trim(),
    middleName: z.string().optional(),
    lastName: z.string().min(1, "Last name is required").trim(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    role: currentUser?.role === "0" 
      ? z.enum(["0", "1", "2"], {
          required_error: "Role is required",
        })
      : z.enum(["0", "1", "2"]).optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }), [currentUser?.role]);

  const form = useForm({
    resolver: zodResolver(registerAccountSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined, // No default role selection
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      // Remove confirmPassword from the data sent to API
      const { confirmPassword, ...accountData } = data;
      
      // Set role based on current user's role
      if (currentUser?.role === "1") { // Admin can only create employees
        accountData.role = "2";
      } else if (currentUser?.role === "0") { // Superadmin can choose role
        accountData.role = data.role || "2"; // Default to employee if not selected
      }
      
      const response = await apiClient.post("/auth/register", accountData);
      
      if (response.data.success) {
        toast.success("Account has been registered successfully", {
          description: date,
        });
        
        // Reset form to default values
        form.reset({
          firstName: "",
          middleName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: undefined, // Reset to no selection
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to register account";
      toast.error(errorMessage, {
        description: date,
      });
    } finally {
      // Always clear sensitive fields after submit attempt
      form.setValue("email", "");
      form.setValue("password", "");
      form.setValue("confirmPassword", "");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-white dark:bg-black">
      <div className="container mx-auto px-6 py-4 h-full flex items-center justify-center">
        <div className="max-w-2xl w-full">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              <CardTitle>Register New Account</CardTitle>
            </div>
            <CardDescription>
              {currentUser?.role === "0" 
                ? "Create a new admin or employee account for the LTO system" 
                : "Create a new employee account for the LTO system"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* First Row: First Name, Middle Name, Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Middle Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter middle name (optional)" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Second Row: Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-foreground">Email Address *</FormLabel>
                        {fieldState.error && (
                          <span className="text-xs text-red-500">{fieldState.error.message}</span>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Third Row: Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-foreground">Password *</FormLabel>
                        {fieldState.error && (
                          <span className="text-xs text-red-500">{fieldState.error.message}</span>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter password" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Fourth Row: Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-foreground">Confirm Password *</FormLabel>
                        {fieldState.error && (
                          <span className="text-xs text-red-500">{fieldState.error.message}</span>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm password" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Fifth Row: Role - Only show for Superadmin */}
                {currentUser?.role === "0" && (
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-foreground">Role *</FormLabel>
                          {fieldState.error && (
                            <span className="text-xs text-red-500">{fieldState.error.message}</span>
                          )}
                        </div>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-auto px-8"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Account
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      form.reset({
                        firstName: "",
                        middleName: "",
                        lastName: "",
                        email: "",
                        password: "",
                        confirmPassword: "",
                        role: undefined,
                      });
                    }}
                    disabled={isSubmitting}
                    className="w-auto px-8"
                  >
                    Clear Form
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
