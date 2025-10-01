import React, { useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Car,
} from "lucide-react";
import TableSkeleton from "@/components/table/TableSkeleton";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { DataTableViewOptions } from "../table/DataTableViewOptions";
import { DataTablePagination } from "../table/DataTablePagination";
import { Badge } from "../ui/badge";

const ExpandableDriverTable = ({
  searchPlaceholder = null,
  title,
  filters,
  description,
  tableColumn,
  data,
  loading,
  onNavigate,
  onAdd,
  onRowClick,
  onEdit,
  onDelete
}) => {
  
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 8,
  });
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sorting, setSorting] = React.useState([]);
  
  const filterColumns = filters;

  const toggleRowExpansion = (rowId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowId)) {
      newExpandedRows.delete(rowId);
    } else {
      newExpandedRows.add(rowId);
    }
    setExpandedRows(newExpandedRows);
  };

  const table = useReactTable({
    data,
    columns: tableColumn(onEdit, onDelete),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnIds, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      
      // Search in main driver data
      const mainDataMatch = filterColumns.some((columnId) => {
        const cellValue = row.getValue(columnId);
        return String(cellValue).toLowerCase().includes(searchValue);
      });
      
      // Search in vehicle details (plate numbers)
      const plateNo = row.original.plateNo;
      const plateNoArray = Array.isArray(plateNo) ? plateNo : [plateNo];
      const vehicleMatch = plateNoArray.some(plate => 
        plate.toLowerCase().includes(searchValue)
      );
      
      return mainDataMatch || vehicleMatch;
    },
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  const renderVehicleDetails = (driver) => {
    const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
    
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-l-4 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Vehicle Details ({plateNoArray.length} vehicle{plateNoArray.length > 1 ? 's' : ''})
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plateNoArray.map((plate, index) => (
            <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {plate}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Vehicle #{index + 1}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          💡 Tip: You can search for any of these plate numbers in the search bar above
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between py-3 flex-shrink-0">
        <div className="space-y-1">
          <Label className="font-semibold">{title}</Label>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={onAdd} className="w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-gray-600 dark:hover:bg-gray-800">
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Add Driver</span>
          </Button>
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="md:flex items-center justify-between py-3 flex-shrink-0">
        <div className="relative hidden md:inline md:max-w-sm flex-shrink">
          <Input
            placeholder={searchPlaceholder || "Search Driver..."}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10 bg-white text-black border-gray-300 dark:bg-black dark:text-white dark:border-gray-600"
          />
        </div>
      </div>

      <div className="rounded-lg border flex-1 overflow-hidden shadow-sm bg-white dark:bg-transparent border-gray-300 dark:border-gray-600 min-h-0">
        <div className="overflow-auto h-full">
          <div className="px-4">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-2 whitespace-nowrap text-left">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="text-xs bg-white dark:bg-transparent">
                {loading ? (
                  <TableSkeleton
                    rowCount={5}
                    cellCount={table.getAllColumns().length}
                  />
                ) : table.getRowModel().rows?.length ? (
                  <>
                    {table.getRowModel().rows.map((row) => {
                      const driver = row.original;
                      const plateNoArray = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
                      const hasMultipleVehicles = plateNoArray.length > 1;
                      const isExpanded = expandedRows.has(row.id);
                      
                      return (
                        <React.Fragment key={row.id}>
                          <TableRow
                            onClick={() => !hasMultipleVehicles ? onRowClick(driver) : toggleRowExpansion(row.id)}
                            data-state={row.getIsSelected() && "selected"}
                            className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 cursor-pointer"
                          >
                            {row.getVisibleCells().map((cell, cellIndex) => (
                              <TableCell key={cell.id} className="px-3 py-2 text-gray-800 dark:text-gray-200 text-left">
                                {cellIndex === 0 && hasMultipleVehicles && (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRowExpansion(row.id);
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <div className="flex items-center gap-2">
                                      {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                      )}
                                      <Badge variant="secondary" className="text-xs">
                                        +{vehicleCount - 1} more
                                      </Badge>
                                    </div>
                                  </div>
                                )}
                                {!(cellIndex === 0 && hasMultipleVehicles) && flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          {hasMultipleVehicles && isExpanded && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell 
                                colSpan={table.getVisibleLeafColumns().length}
                                className="p-0 border-b border-gray-100 dark:border-gray-700"
                              >
                                {renderVehicleDetails(driver)}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length || 5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-sm text-gray-600">No results found</p>
                        <p className="text-xs text-gray-400">
                          Try adjusting your filters or add new data.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <div className="mt-3 flex-shrink-0">
         <DataTablePagination table={table}/>
      </div>
    </div>
  );
};

export default ExpandableDriverTable;
