import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, ArrowLeft, LoaderCircle } from "lucide-react";
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

const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const OTPVerificationSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email input, 2: OTP verification
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const navigate = useNavigate();

  const emailForm = useForm({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(OTPVerificationSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Reset OTP form when step changes to 2
  useEffect(() => {
    if (step === 2) {
      otpForm.reset({
        otp: "",
      });
    }
  }, [step, otpForm]);

  const handleEmailSubmit = async (formData) => {
    try {
      setSubmitting(true);
      setEmail(formData.email);

      const { data } = await apiClient.post("/auth/forgot-password", {
        email: formData.email,
      });

      if (data.success) {
        toast.success(data.message);
        // Reset the OTP form when moving to step 2
        otpForm.reset({
          otp: "",
        });
        setStep(2);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error(error.response?.data?.message || "Failed to send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOTPSubmit = async (formData) => {
    try {
      setSubmitting(true);

      const { data } = await apiClient.post("/auth/verify-password-reset-otp", {
        email: email,
        otp: formData.otp,
      });

      if (data.success) {
        setResetToken(data.resetToken);
        toast.success("OTP verified successfully");
        navigate("/reset-password", { 
          state: { 
            resetToken: data.resetToken,
            email: email 
          } 
        });
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  const handleCancel = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-6 md:mb-8">
          <img src={ltoLogo} alt="LTO Logo" className="h-16 w-16 md:h-20 md:w-20 mx-auto mb-3 md:mb-4" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#1e3a8a] mb-2">LTO SYSTEM</h1>
          <p className="text-xs md:text-sm text-gray-600">Land Transportation Management System</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {step === 1 ? (
            // Step 1: Email Input
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)}>
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                      Forgot Password?
                    </h2>
                    <p className="text-sm md:text-base text-gray-600">
                      Enter your email address and we'll send you an OTP to reset your password.
                    </p>
                  </div>

                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email address"
                              className={cn(
                                "pl-10 h-11 border-gray-300 focus:ring-0 focus:border-[#1e3a8a] rounded-md bg-white text-gray-900 placeholder:text-gray-500",
                                emailForm.formState.errors.email && "border-red-500"
                              )}
                            />
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
                      onClick={handleCancel}
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
                        "Send OTP"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          ) : (
            // Step 2: OTP Verification
            <Form {...otpForm} key="otp-form">
              <form onSubmit={otpForm.handleSubmit(handleOTPSubmit)}>
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                      Verify OTP
                    </h2>
                    <p className="text-sm md:text-base text-gray-600 break-words">
                      We've sent a 6-digit OTP to <strong>{email}</strong>
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                      Please check your email and enter the OTP below.
                    </p>
                  </div>

                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className={cn(
                              "h-11 border-gray-300 focus:ring-0 focus:border-[#1e3a8a] rounded-md bg-white text-gray-900 placeholder:text-gray-500 text-center text-lg tracking-widest",
                              otpForm.formState.errors.otp && "border-red-500"
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 h-11 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold"
                    >
                      {submitting ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}

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
