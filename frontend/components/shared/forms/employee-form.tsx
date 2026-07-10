"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { employeeSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/lib/hooks/use-employees";

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>;
  onSubmit: (data: EmployeeFormData) => void;
  isLoading?: boolean;
}

export function EmployeeForm({
  initialData,
  onSubmit,
  isLoading = false,
}: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_code: initialData?.employee_code || "",
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      department: initialData?.department || "",
      designation: initialData?.designation || "",
      status: initialData?.status || "active",
      joining_date: initialData?.joining_date ? initialData.joining_date.substring(0, 10) : "",
      exit_date: initialData?.exit_date ? initialData.exit_date.substring(0, 10) : null,
      reporting_manager_id: initialData?.reporting_manager_id || null,
    },
  });

  // Fetch managers list (active employees)
  const { data: employeesData } = useEmployees({ status: "active", page_size: 100 });
  const managers = employeesData?.items || [];

  const currentStatus = watch("status");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_code">Employee Code</Label>
          <Input
            id="employee_code"
            placeholder="EMP-123"
            disabled={!!initialData?.employee_code}
            {...register("employee_code")}
          />
          {errors.employee_code && (
            <p className="text-xs text-red-500">{errors.employee_code.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
            defaultValue={initialData?.status || "active"}
            onChange={(e) => setValue("status", e.target.value as any)}
          >
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="exited">Exited</option>
          </select>
          {errors.status && (
            <p className="text-xs text-red-500">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" placeholder="John" {...register("first_name")} />
          {errors.first_name && (
            <p className="text-xs text-red-500">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" placeholder="Doe" {...register("last_name")} />
          {errors.last_name && (
            <p className="text-xs text-red-500">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john.doe@company.com" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input id="department" placeholder="Engineering" {...register("department")} />
          {errors.department && (
            <p className="text-xs text-red-500">{errors.department.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" placeholder="Software Engineer" {...register("designation")} />
          {errors.designation && (
            <p className="text-xs text-red-500">{errors.designation.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="joining_date">Joining Date</Label>
          <Input id="joining_date" type="date" {...register("joining_date")} />
          {errors.joining_date && (
            <p className="text-xs text-red-500">{errors.joining_date.message}</p>
          )}
        </div>

        {currentStatus === "exited" && (
          <div className="space-y-2">
            <Label htmlFor="exit_date">Exit Date</Label>
            <Input id="exit_date" type="date" {...register("exit_date")} />
            {errors.exit_date && (
              <p className="text-xs text-red-500">{errors.exit_date.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reporting_manager_id">Reporting Manager</Label>
        <select
          id="reporting_manager_id"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={watch("reporting_manager_id") || ""}
          onChange={(e) => {
            const val = e.target.value;
            setValue("reporting_manager_id", val ? Number(val) : null);
          }}
        >
          <option value="">None</option>
          {managers
            .filter((m) => !initialData?.employee_code || m.employee_code !== initialData.employee_code)
            .map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.first_name} {manager.last_name} ({manager.designation})
              </option>
            ))}
        </select>
        {errors.reporting_manager_id && (
          <p className="text-xs text-red-500">{errors.reporting_manager_id.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Employee"}
        </Button>
      </div>
    </form>
  );
}
