"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { employeeProjectSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEmployees } from "@/lib/hooks/use-employees";

type AssignProjectFormData = z.infer<typeof employeeProjectSchema>;

interface AssignProjectFormProps {
  onSubmit: (data: AssignProjectFormData) => void;
  isLoading?: boolean;
}

export function AssignProjectForm({
  onSubmit,
  isLoading = false,
}: AssignProjectFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssignProjectFormData>({
    resolver: zodResolver(employeeProjectSchema),
    defaultValues: {
      employee_id: 0,
      role_on_project: "Developer",
      allocation_percent: 100,
      start_date: new Date().toISOString().substring(0, 10),
      end_date: null,
    },
  });

  // Load all active employees for selection
  const { data: employeesData } = useEmployees({ status: "active", page_size: 150 });
  const employees = employeesData?.items || [];

  const selectedEmployee = watch("employee_id");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employee_id">Employee</Label>
        <select
          id="employee_id"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={selectedEmployee || ""}
          onChange={(e) => setValue("employee_id", Number(e.target.value))}
        >
          <option value="0">Select Employee</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} ({emp.department} - {emp.designation})
            </option>
          ))}
        </select>
        {errors.employee_id && (
          <p className="text-xs text-red-500">Please select an employee</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role_on_project">Role on Project</Label>
        <Input
          id="role_on_project"
          placeholder="e.g. Frontend Engineer, PM, QA"
          {...register("role_on_project")}
        />
        {errors.role_on_project && (
          <p className="text-xs text-red-500">{errors.role_on_project.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="allocation_percent">Allocation %</Label>
        <Input
          id="allocation_percent"
          type="number"
          min="1"
          max="100"
          {...register("allocation_percent", { valueAsNumber: true })}
        />
        {errors.allocation_percent && (
          <p className="text-xs text-red-500">{errors.allocation_percent.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" {...register("start_date")} />
          {errors.start_date && (
            <p className="text-xs text-red-500">{errors.start_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">End Date (Optional)</Label>
          <Input id="end_date" type="date" {...register("end_date")} />
          {errors.end_date && (
            <p className="text-xs text-red-500">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="submit" disabled={isLoading || !selectedEmployee}>
          {isLoading ? "Assigning..." : "Assign Project"}
        </Button>
      </div>
    </form>
  );
}
