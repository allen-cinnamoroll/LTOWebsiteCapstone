import React, { useState, useRef, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileJson, X } from "lucide-react";
import apiClient from "@/api/axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const VehicleExportModal = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = format selection, 2 = date filter
  const [format, setFormat] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const buttonRef = useRef(null);

  // Generate years (current year + past 10 years, future 2 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 13 }, (_, i) => currentYear - 10 + i).reverse();

  // Generate months
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setFormat("");
      setYear("");
      setMonth("");
    }
  }, [open]);

  const handleFormatSelect = (selectedFormat) => {
    setFormat(selectedFormat);
    setStep(2);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleExport = async () => {
    if (!format || !year || !month) {
      toast.error("Please select format, year, and month");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/vehicle/export?format=${format}&year=${year}&month=${month}`,
        {
          headers: {
            Authorization: token,
          },
          responseType: "blob", // Important for file download
        }
      );

      // Check if response status indicates an error
      if (response.status < 200 || response.status >= 300) {
        const text = await response.data.text();
        try {
          const errorData = JSON.parse(text);
          toast.error(errorData.message || "Failed to export vehicle data");
        } catch {
          toast.error("Failed to export vehicle data");
        }
        return;
      }

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], {
        type:
          format === "csv"
            ? "text/csv;charset=utf-8;"
            : "application/json;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with date
      const monthName = months.find((m) => m.value === month)?.label || month;
      const filename = `vehicles_${monthName}_${year}.${format}`;
      link.setAttribute("download", filename);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Vehicle data exported successfully as ${format.toUpperCase()}`);
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      
      // Handle blob error responses
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          toast.error(errorData.message || "Failed to export vehicle data");
        } catch {
          toast.error("Failed to export vehicle data");
        }
      } else {
        toast.error(
          error.response?.data?.message || "Failed to export vehicle data"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          className="w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-[#424242] dark:hover:bg-gray-800"
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">Export</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {step === 1 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Select Export Format</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => handleFormatSelect("csv")}
              >
                <FileText className="h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">CSV</span>
                  <span className="text-xs text-gray-500">
                    Comma-separated values
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => handleFormatSelect("json")}
              >
                <FileJson className="h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">JSON</span>
                  <span className="text-xs text-gray-500">
                    JavaScript Object Notation
                  </span>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Select Date Range</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setStep(1)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-sm">
                  Year
                </Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year" className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="month" className="text-sm">
                  Month
                </Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="month" className="w-full">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleExport}
                disabled={loading || !year || !month}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Exporting...
                  </span>
                ) : (
                  "Export"
                )}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default VehicleExportModal;

