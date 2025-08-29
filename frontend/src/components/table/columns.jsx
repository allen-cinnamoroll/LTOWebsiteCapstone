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
    accessorKey: "licenseNo",
    header: "License No.",
    cell: ({ row }) => <div className="">{row.getValue("licenseNo")}</div>,
  },
  {
    accessorKey: "fullname",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Fullname"} />
    ),
    cell: ({ row }) => <div className="">{row.getValue("fullname")}</div>,
  },
  {
    accessorKey: "sex",
    header: "Sex",
    cell: ({ row }) => <div className="">{row.getValue("sex")}</div>,
  },
  {
    accessorKey: "birthDate",
    header: "Birthday",
    cell: ({ row }) => <div className="">{row.getValue("birthDate")}</div>,
  },
  {
    accessorKey: "civilStatus",
    header: "Civil Status",
    cell: ({ row }) => <div className="">{row.getValue("civilStatus")}</div>,
  },
  {
    accessorKey: "issueDate",
    header: "Date Issued",
    cell: ({ row }) => <div className="">{row.getValue("issueDate")}</div>,
  },
  {
    accessorKey: "expiryDate",
    header: "Expiration Date",
    cell: ({ row }) => <div className="">{row.getValue("expiryDate")}</div>,
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
    accessorKey: "licenseNo",
    header: "License No.",
    cell: ({ row }) => <div className="">{row.getValue("licenseNo")}</div>,
  },
  {
    accessorKey: "fullname",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Fullname"} />
    ),
    cell: ({ row }) => <div className="">{row.getValue("fullname")}</div>,
  },
  {
    accessorKey: "sex",
    header: "Sex",
    cell: ({ row }) => <div className="">{row.getValue("sex")}</div>,
  },
  {
    accessorKey: "birthDate",
    header: "Birthday",
    cell: ({ row }) => <div className="">{row.getValue("birthDate")}</div>,
  },
  {
    accessorKey: "civilStatus",
    header: "Civil Status",
    cell: ({ row }) => <div className="">{row.getValue("civilStatus")}</div>,
  },
  {
    accessorKey: "issueDate",
    header: "Date Issued",
    cell: ({ row }) => <div className="">{row.getValue("issueDate")}</div>,
  },
  {
    accessorKey: "expiryDate",
    header: "Expiration Date",
    cell: ({ row }) => <div className="">{row.getValue("expiryDate")}</div>,
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
    accessorKey: "violation_id",
    header: "Violation ID",
    cell: ({ row }) => <div className="">{row.getValue("violation_id")}</div>,
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
    accessorKey: "violation_type",
    header: "Type",
    cell: ({ row }) => <div className="">{row.getValue("violation_type")}</div>,
  },
  {
    accessorKey: "violation_date",
    header: "Date",
    cell: ({ row }) => <div className="">{row.getValue("violation_date")}</div>,
  },
  {
    accessorKey: "penalty",
    header: "Penalty",
    cell: ({ row }) => <div className="">{row.getValue("penalty")}</div>,
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    cell: ({ row }) => <div className="">{row.getValue("remarks")}</div>,
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
    accessorKey: "make",
    header: "Make",
    cell: ({ row }) => <div className="">{row.getValue("make")}</div>,
  },
  {
    accessorKey: "series",
    header: "Series",
    cell: ({ row }) => <div className="">{row.getValue("series")}</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <div className="">{row.getValue("type")}</div>,
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
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => <div className="">{row.getValue("owner")}</div>,
  },
  {
    accessorKey: "dateRegistered",
    header: "Date Registered",
    cell: ({ row }) => <div className="">{row.getValue("dateRegistered")}</div>,
  },
  {
    accessorKey: "expirationDate",
    header: "Expiration Date",
    cell: ({ row }) => <div className="">{row.getValue("expirationDate")}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      
      return (
        <div className="flex items-center gap-2 px-2 py-1 rounded-sm">
          {status === "Active" ? (
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
          ) : (
            <CircleAlert className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            status === "Active" ? "text-green-700" : "text-red-700"
          }`}>
            {status}
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
