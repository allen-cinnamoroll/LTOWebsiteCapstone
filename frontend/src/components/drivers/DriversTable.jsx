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
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  Trash,
} from "lucide-react";

import TableSkeleton from "@/components/table/TableSkeleton";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { DataTableViewOptions } from "../table/DataTableViewOptions";
import { DataTablePagination } from "../table/DataTablePagination";

const DriversTable = ({
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
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10, // Default rows per page
  });
  const [globalFilter, setGlobalFilter] = React.useState("");
  // Define the columns where you want to apply the global filter
  const filterColumns = filters;

  const table = useReactTable({
    data,
    columns: tableColumn( onEdit, onDelete),
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
      // This function will filter across multiple columns
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
  return (
    <>
      <Label className="font-semibold">{title}</Label>
      <div
        className={`md:flex items-center justify-between  py-4
        `}
      >
        <div className="relative hidden md:inline md:max-w-sm flex-shrink">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={"Search Driver..."}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className={"pl-10 bg-white text-black border-gray-300 dark:bg-black dark:text-white dark:border-gray-600"}
          />
        </div>

        <div className="flex gap-2 justify-end md:justify-normal md:items-center">
          <Button
            onClick={onAdd}
            className={"w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-gray-600 dark:hover:bg-gray-800"}
          >
            <Plus />
            <span className="hidden lg:inline">{"Add Driver"}</span>
          </Button>
          <Button
            onClick={onNavigate}
            className={"w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-gray-600 dark:hover:bg-gray-800"}
          >
            <Trash />
            <span className="hidden lg:inline">{"Bin"}</span>
          </Button>
          <DataTableViewOptions table={table}/>
        </div>
      </div>

      <div className="rounded-md border flex-1 overflow-hidden bg-white dark:bg-black border-gray-400 dark:border-gray-600">
        <Table>
          <TableHeader className="text-xs md:text-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="text-xs md:text-sm bg-white dark:bg-black">
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
      <div className="mt-4">
         <DataTablePagination table={table}/>
      </div>
    </>
  );
};

export default DriversTable;
