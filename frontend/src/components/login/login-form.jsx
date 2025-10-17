import { User, Lock, EyeOff, Eye, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { LoginSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ltoLogo from "@/assets/lto_logo.png";

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

  const onSubmit = async (formData) => {
    
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
      
      // Clear any previous form errors but keep form values
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
    <div className={cn("w-full max-w-md", className)} {...props}>
      {/* Login Form Container */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <Form {...form}>
          <form 
            key="login-form"
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
          >
            <div className="flex flex-col gap-4">
              {/* Logo */}
              <div className="flex justify-center mb-3">
                <img src={ltoLogo} alt="LTO Logo" className="h-28 w-28" />
              </div>
              
              {/* Title */}
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[#1e3a8a] mb-1">LTO SYSTEM</h1>
                <p className="text-sm text-gray-600">Land Transportation Management System</p>
              </div>
              
              {/* Form Fields */}
              <div className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="EMAIL"
                            autoComplete="current-email"
                            className={cn(
                              "pl-10 h-11 border-gray-300 focus:ring-0 focus:border-[#1e3a8a] rounded-md",
                              form.formState.errors.email && "border-red-500"
                            )}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            {...field}
                            type={showPass ? "text" : "password"}
                            placeholder="PASSWORD"
                            autoComplete="current-password"
                            className={cn(
                              "pl-10 pr-10 h-11 border-gray-300 focus:ring-0 focus:border-[#1e3a8a] rounded-md",
                              form.formState.errors.password && "border-red-500"
                            )}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={tooglePasswordVisibility}
                            aria-label={
                              showPass ? "Hide Password" : "Show Password"
                            }
                          >
                            {showPass ? (
                              <Eye className="text-gray-400 h-4 w-4" />
                            ) : (
                              <EyeOff className="text-gray-400 h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Remember Username and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <label htmlFor="remember" className="text-sm text-gray-600">
                    Remember Username
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-[#1e3a8a] hover:underline"
                >
                  Forgot Password
                </button>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                disabled={submitting} 
                className="w-full h-12 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold rounded-md"
              >
                {submitting ? (
                  <LoaderCircle className="w-5 h-5 text-white mx-auto animate-spin" />
                ) : (
                  "LOGIN"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
