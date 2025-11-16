import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoaderCircle, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/api/axios";

const OTPVerificationModal = ({ isOpen, onClose, onSuccess, userEmail }) => {
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0 && isOpen) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, isOpen]);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(300);
      setCanResend(false);
      setOtp("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate OTP format
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    // Validate email is present
    if (!userEmail) {
      toast.error("Email address is missing. Please login again.");
      onClose();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiClient.post("/auth/verify-otp", {
        email: userEmail.trim(),
        otp: otp.trim(),
      });

      // Only proceed if response is successful (2xx status)
      if (response.status >= 200 && response.status < 300 && response.data.success) {
        toast.success("OTP verified successfully!");
        if (response.data.token) {
          onSuccess(response.data.token);
        } else {
          toast.error("Token not received. Please try again.");
        }
      } else {
        const errorMessage = response.data?.message || "OTP verification failed";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      
      // Get error message from backend response
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          "OTP verification failed. Please check your code and try again.";
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsSubmitting(true);
    
    try {
      // For now, we'll show a message that user needs to login again
      // In a real implementation, you might want to create a separate resend OTP endpoint
      toast.info("Please login again to receive a new OTP");
      onClose(); // Close the modal so user can login again
    } catch (error) {
      toast.error("Failed to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            OTP Verification Required
          </DialogTitle>
          <DialogDescription>
            Please enter the 6-digit OTP sent to your email address to complete the login process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              OTP sent to: <strong>{userEmail}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Time remaining: {formatTime(timeLeft)}</span>
              {canResend && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleResendOTP}
                  disabled={isSubmitting}
                  className="p-0 h-auto"
                >
                  Resend OTP
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTPVerificationModal;
