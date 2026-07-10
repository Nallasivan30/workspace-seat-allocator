"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Search, UserMinus } from "lucide-react";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@/lib/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormDialog } from "@/components/shared/form-dialog";
import { EmployeeForm } from "@/components/shared/forms/employee-form";
import { useToast } from "@/components/ui/toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function EmployeesPage() {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("");
  const [seatFilter, setSeatFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<any | null>(null);

  // Debounce search term
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const filters = React.useMemo(() => {
    const f: Record<string, any> = {
      page: currentPage,
      page_size: 10,
    };
    if (debouncedSearch) f.q = debouncedSearch;
    if (deptFilter) f.department = deptFilter;
    if (statusFilter) f.status = statusFilter;
    if (seatFilter) {
      f.has_seat = seatFilter === "assigned";
    }
    return f;
  }, [currentPage, debouncedSearch, deptFilter, statusFilter, seatFilter]);

  // Queries & Mutations
  const { data: employeesData, isLoading, refetch } = useEmployees(filters);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(selectedEmployee?.id || "");
  const deleteMutation = useDeleteEmployee();

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: "Employee Created",
        description: "Successfully added new employee profile.",
        type: "success",
      });
      setCreateDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to create employee.",
        type: "error",
      });
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({
        title: "Employee Updated",
        description: "Successfully updated employee details.",
        type: "success",
      });
      setEditDialogOpen(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to update employee.",
        type: "error",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate/delete this employee?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "Employee Deleted",
        description: "Successfully removed employee profile.",
        type: "success",
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to delete employee.",
        type: "error",
      });
    }
  };

  const columns = [
    {
      header: "Code",
      accessorKey: "employee_code" as const,
    },
    {
      header: "Name",
      accessorKey: "name" as const,
      cell: (row: any) => `${row.first_name} ${row.last_name}`,
    },
    {
      header: "Email",
      accessorKey: "email" as const,
    },
    {
      header: "Department",
      accessorKey: "department" as const,
    },
    {
      header: "Designation",
      accessorKey: "designation" as const,
    },
    {
      header: "Seat Assignment",
      accessorKey: "current_seat" as const,
      cell: (row: any) =>
        row.current_seat ? (
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
            {row.current_seat.seat_code}
          </span>
        ) : (
          <span className="text-xs text-zinc-500 italic">Unassigned</span>
        ),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedEmployee(row);
                setEditDialogOpen(true);
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.id)}
              className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Employees Directory</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Monitor employee registration, departments, designations, and workspace mapping
          </p>
        </div>
        <Button
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Filter and search controls */}
      <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Operations">Operations</option>
              <option value="HR">HR</option>
            </select>

            <select
              value={seatFilter}
              onChange={(e) => {
                setSeatFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All Seat Assignments</option>
              <option value="assigned">Has Assigned Seat</option>
              <option value="unassigned">Seat-less Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="exited">Exited</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Datatable */}
      <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-zinc-500">Loading directory...</div>
          ) : (
            <div className="space-y-4">
              <DataTable
                data={employeesData?.items || []}
                columns={columns}
                emptyMessage="No employees found matching filter criteria."
              />

              {/* Pagination block */}
              {employeesData && employeesData.pages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Showing Page {employeesData.page} of {employeesData.pages} (Total: {employeesData.total} profiles)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= employeesData.pages}
                      onClick={() => setCurrentPage((p) => Math.min(employeesData.pages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog Overlay */}
      <FormDialog
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Add New Employee"
        description="Add a new employee register to start seat and project mapping."
      >
        <EmployeeForm onSubmit={handleCreate} isLoading={createMutation.isPending} />
      </FormDialog>

      {/* Edit Dialog Overlay */}
      <FormDialog
        isOpen={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
        title="Edit Employee Profile"
        description="Update contact, role status, manager, or department parameters."
      >
        {selectedEmployee && (
          <EmployeeForm
            initialData={selectedEmployee}
            onSubmit={handleUpdate}
            isLoading={updateMutation.isPending}
          />
        )}
      </FormDialog>
    </div>
  );
}
