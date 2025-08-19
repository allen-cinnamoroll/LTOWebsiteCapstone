import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
const TableSkeleton = ({rowCount, cellCount}) => {
  return (
    <>
    {Array.from({ length: rowCount }).map((_, rowIndex) => (
      <TableRow key={rowIndex}>
        {Array.from({ length: cellCount }).map((_, cellIndex) => (
          <TableCell key={cellIndex}>
            <Skeleton className="h-5" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
  )
}

export default TableSkeleton
