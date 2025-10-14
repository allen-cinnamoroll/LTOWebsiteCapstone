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
import { Plus } from "lucide-react";
import TableSkeleton from "@/components/table/TableSkeleton";
import { Label } from "@/components/ui/label";
import { Button } from "../ui/button";
import { DataTableViewOptions } from "../table/DataTableViewOptions";
import { DataTablePagination } from "../table/DataTablePagination";

const AccidentTable = ({
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
    pageSize: 12, // Start with more rows, will be dynamically adjusted
  });
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [containerHeight, setContainerHeight] = React.useState(0);
  const filterColumns = filters;
  const containerRef = React.useRef(null);

  // Calculate dynamic page size based on available height
  React.useEffect(() => {
    let timeoutId;
    
    const calculatePageSize = () => {
      if (containerRef.current) {
        const containerHeight = containerRef.current.offsetHeight;
        const headerHeight = 180; // Height of title, search, and controls
        const paginationHeight = 80; // Height of pagination controls
        const tableHeaderHeight = 60; // Height of table header
        const rowHeight = 52; // Height of each table row (including padding)
        const availableHeight = containerHeight - headerHeight - paginationHeight - tableHeaderHeight;
        const maxRows = Math.max(8, Math.floor(availableHeight / rowHeight)); // Minimum 8 rows, but can be more
        
        // Cap the maximum rows to prevent too many rows on very large screens
        const cappedRows = Math.min(maxRows, 25);
        
        if (cappedRows !== pagination.pageSize) {
          setPagination(prev => ({ ...prev, pageSize: cappedRows }));
        }
      }
    };

    const debouncedCalculate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculatePageSize, 100);
    };

    // Initial calculation
    setTimeout(calculatePageSize, 100);
    window.addEventListener('resize', debouncedCalculate);
    return () => {
      window.removeEventListener('resize', debouncedCalculate);
      clearTimeout(timeoutId);
    };
  }, [pagination.pageSize]);

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
  return (
    <div ref={containerRef} className="h-full flex flex-col min-h-0">
      <Label className="font-semibold flex-shrink-0">{title}</Label>
      <div className={`md:flex items-center justify-between py-3 flex-shrink-0`}>
        <div className="relative hidden md:inline md:max-w-sm flex-shrink">
          <Input
            placeholder={"Search Accident..."}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className={"pl-10 bg-white text-black border-gray-300 dark:bg-black dark:text-white dark:border-gray-600"}
          />
        </div>
        <div className="flex gap-2 justify-end md:justify-normal md:items-center">
          <Button onClick={onAdd} className={"w-min flex items-center gap-2 bg-white text-black border border-gray-300 hover:bg-gray-100 dark:bg-black dark:text-white dark:border-gray-600 dark:hover:bg-gray-800"}>
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">{"Add Accident"}</span>
          </Button>
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className="border flex-1 overflow-hidden shadow-sm bg-white dark:bg-transparent border-gray-300 dark:border-gray-600 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1">
          <div className="px-0">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-semibold text-gray-800 dark:text-gray-200 px-2 py-4 whitespace-nowrap text-left">
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
                    rowCount={pagination.pageSize}
                    cellCount={table.getAllColumns().length}
                  />
                ) : table.getRowModel().rows?.length ? (
                  <>
                    {table.getRowModel().rows.map((row) => (
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
                    ))}
                    {/* Fill remaining space with empty rows if needed */}
                    {Array.from({ length: Math.max(0, pagination.pageSize - table.getRowModel().rows.length) }).map((_, index) => (
                      <TableRow key={`empty-${index}`} className="hover:bg-transparent">
                        {table.getVisibleLeafColumns().map((column) => (
                          <TableCell key={`empty-${index}-${column.id}`} className="px-3 py-3 h-12 border-b border-gray-100 dark:border-gray-700">
                            &nbsp;
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
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
        <DataTablePagination table={table} />
      </div>
    </div>
  );
};

export default AccidentTable;
