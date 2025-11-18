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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  Trash,
  RefreshCw,
  X,
} from "lucide-react";
import TableSkeleton from "@/components/table/TableSkeleton";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { DataTableViewOptions } from "../table/DataTableViewOptions";
import { DataTablePagination } from "../table/DataTablePagination";
import VehicleExportModal from "../vehicle/VehicleExportModal";

const VehiclesTable = ({
  title,
  filters,
  tableColumn,
  data,
  loading,
  onRowClick,
  onAdd,
  onEdit,
  onRenew,
  onDelete,
  onBinClick,
  submitting,
  onRestore,
  onPermanentDelete,
  showExport = true
}) => {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10, // 10 rows per page
  });
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [hoveredRowId, setHoveredRowId] = React.useState(null);
  // Define the columns where you want to apply the global filter
  const filterColumns = filters;

  const table = useReactTable({
    data,
    columns: onRestore && onPermanentDelete 
      ? tableColumn(onRestore, onPermanentDelete, submitting)
      : tableColumn(onEdit, onRenew, onDelete, submitting),
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
    <div className="h-full flex flex-col">
      <Label className="font-semibold">{title}</Label>
      <div
        className={`md:flex items-center justify-between py-3 flex-shrink-0
        `}
      >
        <div className="relative hidden md:inline md:max-w-sm flex-shrink">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={"Search Vehicle..."}
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
          {onAdd && (
          <Button onClick={onAdd} className={"w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-[#424242] dark:hover:bg-gray-800"}>
            <Plus />
            <span className="hidden lg:inline">{"Add Vehicle"}</span>
          </Button>
          )}
          {onBinClick && (
            <Button onClick={onBinClick} className={"w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-[#424242] dark:hover:bg-gray-800"}>
              <Trash />
              <span className="hidden lg:inline">{"Bin"}</span>
            </Button>
          )}
          {showExport && <VehicleExportModal />}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="border flex-1 overflow-hidden shadow-sm bg-white dark:bg-transparent border-gray-300 dark:border-[#424242] min-h-0">
        <div className="overflow-x-auto overflow-y-auto h-full">
          <div className="px-0 min-w-full">
            <Table className="min-w-full">
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
                        onClick={() => onRowClick && onRowClick(row.original)}
                        onMouseEnter={() => setHoveredRowId(row.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        onMouseMove={(e) => {
                          setMousePosition({ x: e.clientX, y: e.clientY });
                        }}
                        data-state={row.getIsSelected() && "selected"}
                        className={`hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 ${onRowClick ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-2 text-gray-800 dark:text-gray-200 text-left">
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
      {hoveredRowId && onRowClick && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
          }}
        >
          Click to view details
        </div>
      )}
      <div className="mt-2 mb-2 flex-shrink-0">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
};

export default VehiclesTable;
