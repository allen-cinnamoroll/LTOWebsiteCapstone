import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, EyeOff, Eye, LoaderCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import apiClient from "@/api/axios";
import { toast } from "sonner";
import ltoLogo from "@/assets/lto_logo.png";

const ResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if resetToken is available in location state
    if (!location.state?.resetToken) {
      toast.error("Invalid reset link. Please request a new password reset.");
      navigate("/forgot-password");
    }
  }, [location.state, navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (formData) => {
    try {
      setSubmitting(true);

      const { data } = await apiClient.post("/auth/reset-password", {
        resetToken: location.state.resetToken,
        newPassword: formData.newPassword,
      });

      if (data.success) {
        setSuccess(true);
        toast.success("Password reset successfully!");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <img src={ltoLogo} alt="LTO Logo" className="h-20 w-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">LTO SYSTEM</h1>
            <p className="text-sm text-gray-600">Land Transportation Management System</p>
          </div>

          {/* Success Container */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Password Reset Successful!
              </h2>
              <p className="text-gray-600">
                Your password has been successfully reset. You will be redirected to the login page shortly.
              </p>
            </div>

            <Button
              onClick={handleBackToLogin}
              className="w-full h-11 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img src={ltoLogo} alt="LTO Logo" className="h-20 w-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">LTO SYSTEM</h1>
          <p className="text-sm text-gray-600">Land Transportation Management System</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Reset Password
                  </h2>
                  <p className="text-gray-600">
                    Enter your new password below.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            className={cn(
                              "pl-10 pr-10 h-11 border-gray-300 focus:ring-0 focus:border-[#1e3a8a] rounded-md bg-white text-gray-900 placeholder:text-gray-500",
                              form.formState.errors.newPassword && "border-red-500"
                            )}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={togglePasswordVisibility}
                            aria-label={showPassword ? "Hide Password" : "Show Password"}
                          >
                            {showPassword ? (
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

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm New Password"
                            className={cn(
                              "pl-10 pr-10 h-11 border-gray-300 focus:ring-0 focus:border-[#1e3a8a] rounded-md bg-white text-gray-900 placeholder:text-gray-500",
                              form.formState.errors.confirmPassword && "border-red-500"
                            )}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                            onClick={toggleConfirmPasswordVisibility}
                            aria-label={showConfirmPassword ? "Hide Password" : "Show Password"}
                          >
                            {showConfirmPassword ? (
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

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToLogin}
                    className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold"
                  >
                    {submitting ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToLogin}
              className="text-sm text-[#1e3a8a] hover:underline"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
