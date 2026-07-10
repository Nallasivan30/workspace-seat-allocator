import * as React from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  id?: string;
  header: React.ReactNode;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  // Pagination
  page?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  // Sorting
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc") => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records to display.",
  page = 1,
  pageSize = 10,
  totalItems = 0,
  totalPages = 1,
  onPageChange,
  sortField,
  sortOrder,
  onSortChange,
}: DataTableProps<T>) {
  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable || !onSortChange) return;
    const key = (column.accessorKey || column.id) as string;
    if (!key) return;

    if (sortField === key) {
      onSortChange(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "asc");
    }
  };

  const getCellValue = (row: T, column: ColumnDef<T>): React.ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }
    if (column.accessorKey) {
      const val = row[column.accessorKey as keyof T];
      if (val === null || val === undefined) return "-";
      if (typeof val === "boolean") return val ? "Yes" : "No";
      return String(val);
    }
    return "-";
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-max border-collapse text-left text-sm text-zinc-950 dark:text-zinc-50">
          <thead className="bg-zinc-50/75 text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-medium">
            <tr>
              {columns.map((column, idx) => {
                const isSortable = column.sortable && onSortChange;
                const columnKey = (column.accessorKey || column.id) as string;
                const isSorted = sortField === columnKey;

                return (
                  <th
                    key={column.id || String(column.accessorKey) || idx}
                    onClick={() => isSortable && handleSort(column)}
                    className={cn(
                      "px-6 py-4.5 select-none",
                      isSortable && "cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column.header}</span>
                      {isSortable && (
                        <ArrowUpDown
                          className={cn(
                            "h-3.5 w-3.5 transition-colors",
                            isSorted
                              ? "text-zinc-900 dark:text-zinc-50"
                              : "text-zinc-450 dark:text-zinc-500"
                          )}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {isLoading ? (
              // Skeleton rows loading state
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={rIdx} className="hover:bg-transparent">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-6 py-4.5">
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors duration-150"
                >
                  {columns.map((column, cIdx) => (
                    <td key={column.id || String(column.accessorKey) || cIdx} className="px-6 py-4.5 text-zinc-900 dark:text-zinc-100">
                      {getCellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!isLoading && data.length > 0 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1.5">
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Showing{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {(page - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {Math.min(page * pageSize, totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {totalItems}
            </span>{" "}
            entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
