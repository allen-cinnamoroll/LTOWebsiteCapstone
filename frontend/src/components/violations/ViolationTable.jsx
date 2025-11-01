import React from "react";
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
import { Plus, Search, X, ListFilter } from "lucide-react";
import TableSkeleton from "@/components/table/TableSkeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "../ui/button";
import { DataTableViewOptions } from "../table/DataTableViewOptions";
import { DataTablePagination } from "../table/DataTablePagination";

const ViolationTable = ({
  title,
  filters,
  tableColumn,
  data,
  loading,
  onRowClick,
  onAdd,
  onEdit,
  onUpdateStatus,
  submitting
}) => {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 8, // 8 rows per page
  });
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const filterColumns = filters;

  const table = useReactTable({
    data,
    columns: tableColumn(onEdit, onUpdateStatus, submitting),
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
      return filterColumns.some((columnId) => {
        const cellValue = row.getValue(columnId);
        return String(cellValue)
          .toLowerCase()
          .includes(filterValue.toLowerCase());
      });
    },
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  // Apply violation type filter to the table when selection changes
  React.useEffect(() => {
    const column = table.getColumn("violationType");
    if (!column) return;
    if (typeFilter === "all") {
      column.setFilterValue("");
    } else {
      column.setFilterValue(typeFilter);
    }
  }, [typeFilter, table]);

  const getTypeMeta = (value) => {
    switch (value) {
      case "confiscated":
        return { label: "Confiscated", icon: null };
      case "impounded":
        return { label: "Impounded", icon: null };
      case "alarm":
        return { label: "Alarm", icon: null };
      default:
        return { label: "All Types", icon: <ListFilter className="h-3 w-3" /> };
    }
  };
  return (
    <div className="h-full flex flex-col">
      <Label className="font-semibold">{title}</Label>
      <div className={`md:flex items-center justify-between py-3 flex-shrink-0`}>
        <div className="relative hidden md:inline md:max-w-sm flex-shrink">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={"Search Violation..."}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className={"pl-10 pr-10 bg-white text-black border-gray-300 dark:bg-black dark:text-white dark:border-[#424242]"}
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 justify-end md:justify-normal md:items-center">
          {/* Violation Type Filter */}
          <div className="w-40">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-white text-black border border-gray-300 dark:bg-black dark:text-white dark:border-[#424242] h-8 px-2 text-xs">
                <div className="flex items-center gap-2">
                  {getTypeMeta(typeFilter).icon && getTypeMeta(typeFilter).icon}
                  <span className="hidden lg:inline">{getTypeMeta(typeFilter).label}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-3 w-3" />
                    <span>All Types</span>
                  </div>
                </SelectItem>
                <SelectItem value="confiscated">Confiscated</SelectItem>
                <SelectItem value="impounded">Impounded</SelectItem>
                <SelectItem value="alarm">Alarm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onAdd} className={"w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-[#424242] dark:hover:bg-gray-800"}>
            <Plus />
            <span className="hidden lg:inline">{"Add Violation"}</span>
          </Button>
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className="border flex-1 overflow-hidden shadow-sm bg-white dark:bg-transparent border-gray-300 dark:border-[#424242] min-h-0">
        <div className="overflow-hidden h-full">
          <div className="px-0">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-[#18181B] border-b-2 border-gray-300 dark:border-[#424242]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-gray-100/50 dark:hover:bg-[#18181B] dark:bg-[#18181B]">
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
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => onRowClick(row.original)}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-3 py-3 text-gray-800 dark:text-gray-200 text-left">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
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
      <div className="mt-2 mb-2 flex-shrink-0">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
};

export default ViolationTable;
