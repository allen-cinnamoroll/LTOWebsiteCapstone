import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Download } from 'lucide-react';
import dayjs from 'dayjs';
import {
  LICENSE_STATUS_OPTIONS,
  MUNICIPALITIES,
  VEHICLE_TYPE_OPTIONS
} from './registrationConstants';

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

export function RegistrationExportDialog({
  open,
  onOpenChange,
  defaultFilters,
  onGenerate
}) {
  const [reportType, setReportType] = useState('monthly');
  const [dailyDate, setDailyDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [monthlyPeriod, setMonthlyPeriod] = useState(dayjs().format('YYYY-MM'));
  const [yearlyPeriod, setYearlyPeriod] = useState(dayjs().format('YYYY'));
  const [municipality, setMunicipality] = useState('ALL');
  const [vehicleType, setVehicleType] = useState('all');
  const [licenseStatus, setLicenseStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableYears = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 10 }, (_, idx) => String(currentYear - idx));
  }, []);

  useEffect(() => {
    if (!open) return;
    setError('');
    const derivedReportType = defaultFilters?.scope || 'monthly';
    setReportType(derivedReportType);

    if (defaultFilters?.month && defaultFilters?.year) {
      const monthNumber = defaultFilters.month;
      const period = `${defaultFilters.year}-${String(monthNumber).padStart(2, '0')}`;
      setMonthlyPeriod(period);
    } else if (defaultFilters?.year) {
      const period = `${defaultFilters.year}-${dayjs().format('MM')}`;
      setMonthlyPeriod(period);
    } else {
      setMonthlyPeriod(dayjs().format('YYYY-MM'));
    }

    if (defaultFilters?.year) {
      setYearlyPeriod(String(defaultFilters.year));
    } else {
      setYearlyPeriod(dayjs().format('YYYY'));
    }

    if (defaultFilters?.municipality) {
      setMunicipality(defaultFilters.municipality);
    } else {
      setMunicipality('ALL');
    }

    if (defaultFilters?.vehicleType) {
      setVehicleType(defaultFilters.vehicleType);
    } else {
      setVehicleType('all');
    }

    if (defaultFilters?.licenseStatus) {
      setLicenseStatus(defaultFilters.licenseStatus);
    } else {
      setLicenseStatus('all');
    }
  }, [open, defaultFilters]);

  const getPeriodPayload = () => {
    if (reportType === 'daily') {
      return dailyDate;
    }
    if (reportType === 'monthly') {
      return monthlyPeriod;
    }
    return yearlyPeriod;
  };

  const validatePeriod = () => {
    if (reportType === 'daily' && !dailyDate) {
      setError('Please select a date for the daily report.');
      return false;
    }
    if (reportType === 'monthly' && !monthlyPeriod) {
      setError('Please select a month for the monthly report.');
      return false;
    }
    if (reportType === 'yearly' && !yearlyPeriod) {
      setError('Please select a year for the yearly report.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validatePeriod()) {
      return;
    }
    setLoading(true);
    try {
      const payload = {
        scope: reportType,
        period: getPeriodPayload(),
        municipalityId: municipality || 'ALL',
        vehicleType,
        licenseStatus
      };
      await onGenerate(payload);
      onOpenChange(false);
    } catch (err) {
      const message = err?.message || 'Failed to generate reports.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderPeriodInput = () => {
    if (reportType === 'daily') {
      return (
        <div className="space-y-2">
          <Label htmlFor="dailyDate" className="text-sm text-gray-700 dark:text-gray-200">
            Select Date
          </Label>
          <div className="relative">
            <Input
              id="dailyDate"
              type="date"
              value={dailyDate}
              onChange={(event) => setDailyDate(event.target.value)}
              className="pl-10"
              required
            />
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      );
    }
    if (reportType === 'monthly') {
      return (
        <div className="space-y-2">
          <Label htmlFor="monthlyPeriod" className="text-sm text-gray-700 dark:text-gray-200">
            Select Month and Year
          </Label>
          <Input
            id="monthlyPeriod"
            type="month"
            value={monthlyPeriod}
            onChange={(event) => setMonthlyPeriod(event.target.value)}
            required
          />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <Label htmlFor="yearlyPeriod" className="text-sm text-gray-700 dark:text-gray-200">
          Select Year
        </Label>
        <Select value={yearlyPeriod} onValueChange={setYearlyPeriod}>
          <SelectTrigger id="yearlyPeriod">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              Export Registration Reports
            </DialogTitle>
            <DialogDescription className="text-sm">
              Generate both PDF and CSV files using the same analytics data to ensure
              accurate and consistent reporting.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-200">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderPeriodInput()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-200">Municipality</Label>
              <Select value={municipality} onValueChange={setMunicipality}>
                <SelectTrigger>
                  <SelectValue placeholder="Select municipality" />
                </SelectTrigger>
                <SelectContent>
                  {MUNICIPALITIES.map((mun) => (
                    <SelectItem key={mun.value} value={mun.value}>
                      {mun.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-200">Vehicle Type</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toLowerCase()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700 dark:text-gray-200">Owner License Status</Label>
              <Select value={licenseStatus} onValueChange={setLicenseStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="License status" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your selections will be applied to both PDF and CSV exports. Files will be downloaded
            automatically once ready.
          </p>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

