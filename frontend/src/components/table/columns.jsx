export const accidentColumns = (onEdit, onUpdateStatus, submitting) => [
  {
    accessorKey: "blotterNo",
    header: "Blotter No.",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("blotterNo")}</div>,
  },
  {
    accessorKey: "vehiclePlateNo",
    header: "Vehicle Plate No.",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("vehiclePlateNo") || "N/A"}</div>,
  },
  {
    accessorKey: "incidentType",
    header: "Incident Type",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("incidentType") || "N/A"}</div>,
  },
  {
    accessorKey: "suspect",
    header: "Suspect",
    cell: ({ row }) => <div className="text-gray-700 dark:text-gray-200 text-xs">{row.getValue("suspect") || "N/A"}</div>,
  },
  {
    accessorKey: "dateCommited",
    header: "Date Committed",
    cell: ({ row }) => <div className="text-gray-700 dark:text-gray-200 text-xs">{row.getValue("dateCommited")}</div>,
  },
  {
    accessorKey: "caseStatus",
    header: "Case Status",
    cell: ({ row }) => {
      const caseStatus = row.getValue("caseStatus");
      const statusColors = {
        pending: "text-yellow-600 bg-yellow-100",
        ongoing: "text-blue-600 bg-blue-100", 
        solved: "text-green-600 bg-green-100",
        closed: "text-gray-600 bg-gray-100"
      };
      return (
        <div className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${statusColors[caseStatus?.toLowerCase()] || 'text-gray-600 bg-gray-100'}`}>
          {caseStatus || "N/A"}
        </div>
      );
    },
  },
  {
    accessorKey: "municipality",
    header: "Municipality",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("municipality") || "N/A"}</div>,
  },
  {
    accessorKey: "barangay",
    header: "Barangay",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("barangay") || "N/A"}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const accident = row.original;
      const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(accident._id);
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-5 w-5 p-0">
              <span className="sr-only">Open menu</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-24">
            <DropdownMenuLabel className="text-xs py-1">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit} className="text-xs py-1">
              <Edit className="h-3 w-3 mr-2" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
import React, { useState } from "react";
import { CaretSortIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2Icon,
  CircleAlert,
  CopyMinus,
  Edit,
  Plus,
  RefreshCw,
  Trash,
} from "lucide-react";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import { Badge } from "../ui/badge";
import PlateNumberDisplay from "@/components/drivers/PlateNumberDisplay";
import FileNumberDisplay from "@/components/drivers/FileNumberDisplay";
import apiClient from "@/api/axios";


export const deactivatedDriverColumns = (onAction) => [
  {
    accessorKey: "plateNo",
    header: "Plate No.",
    cell: ({ row }) => <div className="">{row.getValue("plateNo")}</div>,
  },
  {
    accessorKey: "ownerRepresentativeName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Owner/Representative Name"} />
    ),
    cell: ({ row }) => <div className="">{row.getValue("ownerRepresentativeName")}</div>,
  },
  {
    accessorKey: "hasDriversLicense",
    header: "Driver's License",
    cell: ({ row }) => {
      const hasLicense = row.getValue("hasDriversLicense");
      const licenseNumber = row.original.driversLicenseNumber;
      return (
        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
          {hasLicense ? (
            <>
              <span className="font-semibold text-green-600 whitespace-nowrap">Yes</span>
              {licenseNumber && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">{licenseNumber}</span>
              )}
            </>
          ) : (
            <span className="font-semibold text-red-600 whitespace-nowrap">No</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "birthDate",
    header: "Birthday",
    cell: ({ row }) => {
      const birthDate = row.getValue("birthDate");
      return <div className="">{birthDate ? new Date(birthDate).toLocaleDateString() : "None"}</div>;
    },
  },
  {
    accessorKey: "contactNumber",
    header: "Contact Number",
    cell: ({ row }) => {
      const contactNumber = row.getValue("contactNumber");
      return <div className="">{contactNumber || "None"}</div>;
    },
  },
  {
    accessorKey: "emailAddress",
    header: "Email Address",
    cell: ({ row }) => {
      const emailAddress = row.getValue("emailAddress");
      return <div className="">{emailAddress || "None"}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const driver = row.original;
      const handleManage = (e) => {
        e.stopPropagation();
        onAction(driver._id);
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-5 w-5 p-0">
              <span className="sr-only">Open menu</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleManage}>
              Activate
              <Plus />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const driverColumns = (onEdit, onDelete, onFileNumberClick) => [
  {
    accessorKey: "ownerRepresentativeName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Owner"} disableHide={true} />
    ),
    cell: ({ row }) => (
      <div className="font-medium text-gray-900 dark:text-gray-200 text-xs max-w-sm break-words whitespace-normal leading-tight">
        {row.getValue("ownerRepresentativeName")}
      </div>
    ),
    size: 300, // Set explicit width for Owner column
  },
  {
    accessorKey: "vehicleCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"No. of Vehicles"} disableHide={true} />
    ),
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs text-center">{row.getValue("vehicleCount") || 0}</div>,
    size: 80, // Set smaller width for No. of Vehicles column
  },
  {
    accessorKey: "emailAddress",
    header: "Email Address",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("emailAddress") || "N/A"}</div>,
  },
  {
    accessorKey: "province",
    header: "Province",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("province") || "N/A"}</div>,
  },
  {
    accessorKey: "municipality",
    header: "Municipality",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("municipality") || "N/A"}</div>,
  },
  {
    accessorKey: "barangay",
    header: "Barangay",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("barangay") || "N/A"}</div>,
  },
  {
    accessorKey: "birthDate",
    header: "Birthdate",
    cell: ({ row }) => {
      const birthDate = row.getValue("birthDate");
      if (!birthDate) {
        return <div className="text-gray-500 dark:text-gray-400 text-xs">None</div>;
      }
      
      const dateObj = new Date(birthDate);
      if (isNaN(dateObj.getTime())) {
        return <div className="text-red-500 text-xs">Invalid Date</div>;
      }
      
      return <div className="text-gray-700 dark:text-gray-200 text-xs">{dateObj.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "hasDriversLicense",
    header: "Driver's License",
    cell: ({ row }) => {
      const hasLicense = row.getValue("hasDriversLicense");
      const licenseNumber = row.original.driversLicenseNumber;
      return (
        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
          {hasLicense ? (
            <>
              <span className="font-semibold text-green-600 text-xs whitespace-nowrap">Yes</span>
              {licenseNumber && (
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{licenseNumber}</span>
              )}
            </>
          ) : (
            <span className="font-semibold text-red-600 text-xs whitespace-nowrap">No</span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Action",
    enableHiding: false,
    cell: ({ row }) => {
      const driver = row.original;
      const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(driver._id);
      };

      return (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleEdit}
          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
        >
          <Edit className="h-4 w-4" />
        </Button>
      );
    },
  },
];
export const violationColumns = (onEdit, onUpdateStatus, submitting) => [
  {
    accessorKey: "topNo",
    header: "TOP NO.",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("topNo")}</div>,
  },
      {
      accessorKey: "firstName",
      header: "Full Name",
      cell: ({ row }) => {
        const firstName = row.getValue("firstName");
        const middleInitial = row.original.middleInitial;
        const lastName = row.original.lastName;
        const suffix = row.original.suffix;
        
        // If all name fields are "None" or null (alarm type), display "None"
        if ((firstName === "None" || !firstName) && (middleInitial === "None" || !middleInitial) && (lastName === "None" || !lastName) && (suffix === "None" || !suffix)) {
          return <div className="text-gray-500 dark:text-gray-400 text-xs">None</div>;
        }
        
        const parts = [firstName];
        if (middleInitial && middleInitial !== "None") parts.push(middleInitial);
        if (lastName && lastName !== "None") parts.push(lastName);
        if (suffix && suffix !== "None") parts.push(suffix);
        
        return <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{parts.join(" ")}</div>;
      },
    },
  {
    accessorKey: "violations",
    header: "Violations",
    cell: ({ row }) => {
      const violations = row.getValue("violations");
      let violationCount = 0;
      
      if (violations && Array.isArray(violations)) {
        // Count only non-"None" violations
        violationCount = violations.filter(v => v && v !== "None").length;
      } else if (violations && violations !== "None") {
        violationCount = 1;
      }
      
      return (
        <div className="text-xs text-gray-900 dark:text-gray-200 font-medium">
          {violationCount > 0 ? violationCount : "0"}
        </div>
      );
    },
  },
  {
    accessorKey: "violationType",
    header: "Type",
    cell: ({ row }) => {
      const violationType = row.getValue("violationType");
      const getTypeText = (violationType) => {
        switch (violationType) {
          case "confiscated":
            return "Confiscated";
          case "alarm":
            return "Alarm";
          case "impounded":
            return "Impounded";
          default:
            return "Unknown";
        }
      };
                const getTypeColor = (violationType) => {
                  switch (violationType) {
                    case "confiscated":
                      return "bg-red-100 text-red-800"; // Confiscated should be red
                    case "alarm":
                      return "bg-yellow-100 text-yellow-800"; // Alarm should be yellow
                    case "impounded":
                      return "bg-orange-100 text-orange-800"; // Impounded remains orange
                    default:
                      return "bg-gray-100 text-gray-800";
                  }
                };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(violationType)}`}>
          {getTypeText(violationType)}
        </span>
      );
    },
  },
  {
    accessorKey: "licenseType",
    header: "License Type",
    cell: ({ row }) => {
      const licenseType = row.getValue("licenseType");
      return <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{licenseType && licenseType !== "None" && licenseType !== "N/A" ? licenseType : "N/A"}</div>;
    },
  },
  {
    accessorKey: "plateNo",
    header: "Plate No.",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("plateNo")}</div>,
  },
  {
    accessorKey: "dateOfApprehension",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date of Apprehension" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("dateOfApprehension");
      return <div className="text-gray-700 dark:text-gray-200 text-xs">{date ? new Date(date).toLocaleDateString() : "None"}</div>;
    },
  },
  {
    accessorKey: "apprehendingOfficer",
    header: "Officer",
    cell: ({ row }) => <div className="font-medium text-gray-700 dark:text-gray-200 text-xs">{row.getValue("apprehendingOfficer") || "None"}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const violation = row.original;
      const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(violation._id);
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-5 w-5 p-0">
              <span className="sr-only">Open menu</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-24">
            <DropdownMenuLabel className="text-xs py-1">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit} className="text-xs py-1">
              <Edit className="h-3 w-3 mr-2" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export const driverLogs = () => [
  {
    accessorKey: "id",
    header: "Log ID",
    cell: ({ row }) => <div className="">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "type",
    header: "Type ",
    cell: ({ row }) => <div className="">{row.getValue("type")}</div>,
  },
  {
    accessorKey: "message",
    header: "Message ",
    cell: ({ row }) => <div className="">{row.getValue("message")}</div>,
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => <div className="">{row.getValue("timestamp")}</div>,
  },
];

export const logs = () => [
  {
    accessorKey: "id",
    header: "Log ID",
    cell: ({ row }) => <div className="">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "fullname",
    header: "Owner",
    cell: ({ row }) => <div className="">{row.getValue("fullname")}</div>,
  },
  {
    accessorKey: "type",
    header: "Type ",
    cell: ({ row }) => <div className="">{row.getValue("type")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: "Timestamp",
    cell: ({ row }) => <div className="">{row.getValue("createdAt")}</div>,
  },
];

export const vehicleColumns = (onEdit, onRenew, submitting) => [
  {
    accessorKey: "plateNo",
    header: "Plate No.",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("plateNo")}</div>,
  },
  {
    accessorKey: "fileNo",
    header: "File No.",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("fileNo") || "N/A"}</div>,
  },
  {
    accessorKey: "engineNo",
    header: "Engine No.",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("engineNo") || "N/A"}</div>,
  },
  {
    accessorKey: "chassisNo",
    header: "Chassis No.",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("chassisNo") || "N/A"}</div>,
  },
  {
    accessorKey: "dateOfRenewal",
    header: "Date of Renewal",
    cell: ({ row }) => {
      const dates = row.getValue("dateOfRenewal");
      if (!dates || (Array.isArray(dates) && dates.length === 0)) {
        return <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">Not set</div>;
      }

      const dateArray = Array.isArray(dates) ? dates : [dates];
      const latest = dateArray[dateArray.length - 1];
      const latestDate = latest?.date || latest;

      return (
        <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">
          {latestDate ? new Date(latestDate).toLocaleDateString() : "Not set"}
          {dateArray.length > 1 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ({dateArray.length} renewals)
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "classification",
    header: "Classification",
    cell: ({ row }) => <div className="font-medium text-gray-900 dark:text-gray-200 text-xs">{row.getValue("classification") || "N/A"}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const expirationInfo = row.original.expirationInfo;
      const isActive = status === "1" || status === 1;
      
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-2 py-1 rounded-sm">
            {isActive ? (
              <CheckCircle2Icon className="h-3 w-3 text-green-600" />
            ) : (
              <CircleAlert className="h-3 w-3 text-red-600" />
            )}
            <span className={`text-xs font-medium ${
              isActive ? "text-green-700" : "text-red-700"
            }`}>
              {isActive ? "Active" : "Expired"}
            </span>
          </div>
          {expirationInfo && (
            <div className="text-xs text-muted-foreground px-2">
              <div>Last 2 digits: {expirationInfo.lastTwoDigits}</div>
              <div>{expirationInfo.week} week of {expirationInfo.month}</div>
              {expirationInfo.expirationDate && (
                <div>Expires: {new Date(expirationInfo.expirationDate).toLocaleDateString()}</div>
              )}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    cell: ({ row }) => {
      const vehicle = row.original;
      const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(vehicle._id);
      };
      const handleRenew = (e) => {
        e.stopPropagation();
        onRenew(vehicle);
      };
      return (
        <div className="flex items-center gap-1">
          <div className="relative group">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
              disabled={submitting}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Edit
            </div>
          </div>
          <div className="relative group">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleRenew}
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              disabled={submitting}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              Renew
            </div>
          </div>
        </div>
      );
    },
  },
];
