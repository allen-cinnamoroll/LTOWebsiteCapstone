import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format, addMonths, setYear, setMonth } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";

const DatePicker = ({ fieldValue, dateValue }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(fieldValue || today);
  const [selectedYear, setSelectedYear] = useState((fieldValue || today).getFullYear());
  const [selectedMonth, setSelectedMonth] = useState((fieldValue || today).getMonth());

  // Handle Year Change
  const handleYearChange = (year) => {
    setSelectedYear(year);
    const updatedDate = setYear(selectedDate, year);
    setSelectedDate(updatedDate);
    if (dateValue) dateValue(updatedDate);
  };

  // Handle Month Change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    const updatedDate = setMonth(selectedDate, month);
    setSelectedDate(updatedDate);
    if (dateValue) dateValue(updatedDate);
  };

  // Handle Date Selection
  const handleDateSelect = (date) => {
    if (date) {
      setSelectedDate(date);
      setSelectedYear(date.getFullYear());
      setSelectedMonth(date.getMonth());
      if (dateValue) dateValue(date);
    }
  };

  // Update state when fieldValue prop changes
  useEffect(() => {
    if (fieldValue) {
      setSelectedDate(fieldValue);
      setSelectedYear(fieldValue.getFullYear());
      setSelectedMonth(fieldValue.getMonth());
    }
  }, [fieldValue]);

  return (
    <>
      <div className="flex gap-2">
        {/* Month Selection */}
        <Select
          onValueChange={(value) => handleMonthChange(parseInt(value, 10))}
          value={selectedMonth.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Month" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {format(new Date(2000, i, 1), "MMMM")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Selection */}
        <Select
          onValueChange={(value) => handleYearChange(parseInt(value, 10))}
          value={selectedYear.toString()}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 150 }, (_, i) => {
              const year = new Date().getFullYear() - 50 + i; // Start 50 years before current year, extend 100 years into future
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Component */}
      <div className="border rounded-md">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={(date) => date < new Date("1900-01-01")}
          fromYear={1900}
          toYear={new Date().getFullYear() + 10}
          month={selectedDate}
          onMonthChange={(date) => {
            setSelectedDate(date);
            setSelectedYear(date.getFullYear());
            setSelectedMonth(date.getMonth());
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSelectedMonth(today.getMonth());
            setSelectedYear(today.getFullYear());
            setSelectedDate(today);
            if (dateValue) dateValue(today);
          }}
        >
          Today
        </Button>
      </div>
    </>
  );
};

export default DatePicker;
