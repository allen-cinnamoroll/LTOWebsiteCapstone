export const accidentColumns = (onEdit, onUpdateStatus, submitting) => [
  {
    accessorKey: "accident_id",
    header: "Accident ID",
    cell: ({ row }) => <div className="">{row.getValue("accident_id")}</div>,
  },
  {
    accessorKey: "driver_id",
    header: "Driver License No.",
    cell: ({ row }) => <div className="">{row.getValue("driver_id")}</div>,
  },
  {
    accessorKey: "vehicle_id",
    header: "Vehicle Plate No.",
    cell: ({ row }) => <div className="">{row.getValue("vehicle_id")}</div>,
  },
  {
    accessorKey: "accident_date",
    header: "Date",
    cell: ({ row }) => <div className="">{row.getValue("accident_date")}</div>,
  },
  {
    accessorKey: "street",
    header: "Street",
    cell: ({ row }) => <div className="">{row.getValue("street")}</div>,
  },
  {
    accessorKey: "barangay",
    header: "Barangay",
    cell: ({ row }) => <div className="">{row.getValue("barangay")}</div>,
  },
  {
    accessorKey: "municipality",
    header: "Municipality",
    cell: ({ row }) => <div className="">{row.getValue("municipality")}</div>,
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
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              Edit
              <Edit />
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
  Trash,
} from "lucide-react";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import { Badge } from "../ui/badge";
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
        <div className="">
          {hasLicense ? (
            <div>
              <div className="font-semibold text-green-600">Yes</div>
              {licenseNumber && (
                <div className="text-xs text-muted-foreground">{licenseNumber}</div>
              )}
            </div>
          ) : (
            <div className="font-semibold text-red-600">No</div>
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
    accessorKey: "dateOfRenewal",
    header: "Date of Renewal",
    cell: ({ row }) => <div className="">{row.getValue("dateOfRenewal")}</div>,
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

export const driverColumns = (onEdit, onDelete) => [
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
        <div className="">
          {hasLicense ? (
            <div>
              <div className="font-semibold text-green-600">Yes</div>
              {licenseNumber && (
                <div className="text-xs text-muted-foreground">{licenseNumber}</div>
              )}
            </div>
          ) : (
            <div className="font-semibold text-red-600">No</div>
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
    accessorKey: "dateOfRenewal",
    header: "Date of Renewal",
    cell: ({ row }) => {
      const date = row.getValue("dateOfRenewal");
      return (
        <div className="">
          {date ? new Date(date).toLocaleDateString() : "Not set"}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const isActive = status === "1" || status === 1;
      
      return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-sm">
          {isActive ? (
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
          ) : (
            <CircleAlert className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            isActive ? "text-green-700" : "text-red-700"
          }`}>
            {isActive ? "Active" : "Expired"}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const driver = row.original;
      const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(driver._id);
      };

      const handleDelete = (e) => {
        e.stopPropagation();
        onDelete(driver._id);
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-5 w-5 p-0">
              <span className="sr-only">Open menu</span>
              <DotsHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="text-xs" align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              Edit <Edit />
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleDelete}>
              Deactivate
              <Trash />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
export const violationColumns = (onEdit, onUpdateStatus, submitting) => [
  {
    accessorKey: "topNo",
    header: "TOP NO.",
    cell: ({ row }) => <div className="font-medium">{row.getValue("topNo")}</div>,
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
          return <div className="">None</div>;
        }
        
        const parts = [firstName];
        if (middleInitial && middleInitial !== "None") parts.push(middleInitial);
        if (lastName && lastName !== "None") parts.push(lastName);
        if (suffix && suffix !== "None") parts.push(suffix);
        
        return <div className="">{parts.join(" ")}</div>;
      },
    },
  {
    accessorKey: "violations",
    header: "Violations",
    cell: ({ row }) => {
      const violations = row.getValue("violations");
      return (
        <div className="max-w-xs">
          {violations && violations.length > 0 && violations[0] !== "None" 
            ? (Array.isArray(violations) ? violations.join(", ") : violations) 
            : "None"}
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
                      return "bg-blue-100 text-blue-800";
                    case "alarm":
                      return "bg-red-100 text-red-800";
                    case "impounded":
                      return "bg-orange-100 text-orange-800";
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
      return <div className="">{licenseType && licenseType !== "None" ? licenseType : "None"}</div>;
    },
  },
  {
    accessorKey: "plateNo",
    header: "Plate No.",
    cell: ({ row }) => <div className="">{row.getValue("plateNo")}</div>,
  },
  {
    accessorKey: "dateOfApprehension",
    header: "Date of Apprehension",
    cell: ({ row }) => {
      const date = row.getValue("dateOfApprehension");
      return <div className="">{date ? new Date(date).toLocaleDateString() : "None"}</div>;
    },
  },
  {
    accessorKey: "apprehendingOfficer",
    header: "Officer",
    cell: ({ row }) => <div className="">{row.getValue("apprehendingOfficer") || "None"}</div>,
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
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEdit}>
              Edit
              <Edit />
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
    header: "Driver",
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

export const vehicleColumns = (onEdit, submitting) => [
  {
    accessorKey: "plateNo",
    header: "Plate No.",
    cell: ({ row }) => <div className="">{row.getValue("plateNo")}</div>,
  },
  {
    accessorKey: "fileNo",
    header: "File No.",
    cell: ({ row }) => <div className="">{row.getValue("fileNo")}</div>,
  },
  {
    accessorKey: "engineNo",
    header: "Engine No.",
    cell: ({ row }) => <div className="">{row.getValue("engineNo")}</div>,
  },
  {
    accessorKey: "chassisNo",
    header: "Chassis No.",
    cell: ({ row }) => <div className="">{row.getValue("chassisNo")}</div>,
  },
  {
    accessorKey: "make",
    header: "Make",
    cell: ({ row }) => <div className="">{row.getValue("make")}</div>,
  },
  {
    accessorKey: "bodyType",
    header: "Body Type",
    cell: ({ row }) => <div className="">{row.getValue("bodyType")}</div>,
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => <div className="">{row.getValue("color")}</div>,
  },
  {
    accessorKey: "classification",
    header: "Classification",
    cell: ({ row }) => <div className="">{row.getValue("classification")}</div>,
  },
  {
    accessorKey: "dateOfRenewal",
    header: "Date of Renewal",
    cell: ({ row }) => {
      const date = row.getValue("dateOfRenewal");
      return (
        <div className="">
          {date ? new Date(date).toLocaleDateString() : "Not set"}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const isActive = status === "1" || status === 1;
      
      return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-sm">
          {isActive ? (
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
          ) : (
            <CircleAlert className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            isActive ? "text-green-700" : "text-red-700"
          }`}>
            {isActive ? "Active" : "Expired"}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const vehicle = row.original;
      const handleEdit = (e) => {
        e.stopPropagation();
        onEdit(vehicle._id);
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
            <DropdownMenuItem onClick={handleEdit}>
              Edit
              <Edit />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
