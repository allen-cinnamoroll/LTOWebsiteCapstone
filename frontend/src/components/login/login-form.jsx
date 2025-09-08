import { GalleryVerticalEnd, EyeOff, Eye, LoaderCircle } from "lucide-react";
import { useState, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { LoginSchema } from "@/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function LoginForm({ className, ...props }) {
  const [showPass, setShowPass] = useState(false);
  const [submitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Note: Navigation is handled by ProtectedRoutes when using modal approach
  // No need to navigate here as it can cause conflicts with OTP modal

  const tooglePasswordVisibility = () => {
    setShowPass(!showPass);
  };

  const form = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (formData, event) => {
    // Prevent default form submission behavior
    if (event) {
      event.preventDefault();
    }
    
    try {
      setIsSubmitting(true);
      setErrorMessage(null); // Clear any previous error messages
      
      const { data } = await apiClient.post("/auth/login", formData);
      if (data) {
        setIsSubmitting(false);
        
        // Check if OTP is required
        if (data.requiresOTP) {
          // For admin/employee users, we get a token with isOtpVerified: false
          // ProtectedRoutes will handle showing the OTP modal
          toast.success(`OTP has been sent to ${data.email}. Please check your email.`);
          if (data.token) {
            login(data.token);
          }
          return;
        }
        
        // Direct login for superadmin or after OTP verification
        if (data.token) {
          login(data.token);
          // Navigate to dashboard for direct login
          navigate("/");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      
      // Clear any previous form errors
      form.clearErrors();
      
      const errorType =
        error.response?.data?.message === "Password is incorrect" ? "0" : "1";

      if (errorType === "0") {
        form.setError("password", {
          type: "manual",
          message: "Password is incorrect",
        });
      } else {
        form.setError("email", {
          type: "manual",
          message: "Email or license number is incorrect",
        });
      }

      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col  gap-2">
              <a
                href="#"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-6" />
                </div>
              </a>
              <h1 className="text-xl font-bold">Login</h1>
              <div className="text-start text-sm">
                Fill in the form to get started.{" "}
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="m@example.com"
                          autoComplete="current-email"
                          className={cn(
                            "border border-input focus:ring-0",
                            form.formState.errors.email && "border-red-500"
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-2">
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative w-full ">
                          <Input
                            {...field}
                            type={showPass ? "text" : "password"}
                            autoComplete="current-password"
                            className={cn(
                              "border border-input focus:ring-0",
                              form.formState.errors.password && "border-red-500"
                            )}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-0 top-0 h-full w-min px-3 py-2 hover:bg-transparent"
                            onClick={tooglePasswordVisibility}
                            aria-label={
                              showPass ? "Hide Password" : "Show Password"
                            }
                          >
                            {showPass ? (
                              <Eye className="text-gray-500 size-4" />
                            ) : (
                              <EyeOff className="text-gray-500 size-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button disabled={submitting} id="submit" className="w-full">
                {submitting ? (
                  <LoaderCircle className="w-6 h-6 text-primary-foreground mx-auto animate-spin" />
                ) : (
                  "Login" 
                )}
              </Button>
            </div>
            <div className="relative text-end text-sm ">
              <a
                href="#"
                className="relative z-10 bg-background px-2 text-muted-foreground"
              >
                Forgot your password?
              </a>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
