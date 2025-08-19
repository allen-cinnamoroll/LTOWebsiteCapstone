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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export const vehicleColumns = (onEdit, onUpdateStatus, submitting) => [
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
      const [status, setStatus] = useState(row.original.status);
      const vehicleId = row.original._id;

      const handleStatusChange = async (newStatus) => {
        setStatus(newStatus);
        onUpdateStatus({ vehicleId, newStatus });
      };

      return (
        <Select
          value={status}
          onValueChange={handleStatusChange}
          disabled={submitting}
        >
          <SelectTrigger className="justify-start gap-2 h-8 w-28 px-2 [&_svg]:size-4 rounded-sm">
            {status === "Active" ? (
              <CheckCircle2Icon className="" />
            ) : (
              <CircleAlert className="" />
            )}
            {status}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
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
