"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { autoAllocateSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useBuildings, useBuildingFloors } from "@/lib/hooks/use-seats";

type AutoAllocateFormData = z.infer<typeof autoAllocateSchema>;

interface AutoAllocateFormProps {
  initialEmployeeId?: number;
  onSubmit: (data: AutoAllocateFormData) => void;
  isLoading?: boolean;
}

export function AutoAllocateForm({
  initialEmployeeId,
  onSubmit,
  isLoading = false,
}: AutoAllocateFormProps) {
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<number | undefined>();

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AutoAllocateFormData>({
    resolver: zodResolver(autoAllocateSchema),
    defaultValues: {
      employee_id: initialEmployeeId || 0,
      building_id: undefined,
      floor_id: undefined,
      seat_type: undefined,
    },
  });

  // Query unassigned employees
  const { data: employeesData } = useEmployees({ status: "active", has_seat: false, page_size: 100 });
  const employees = employeesData?.items || [];

  const { data: buildings } = useBuildings();
  const { data: floors } = useBuildingFloors(selectedBuildingId);

  const selectedEmployee = watch("employee_id");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employee_id">Employee (Active, Seat-less)</Label>
        <select
          id="employee_id"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={selectedEmployee || ""}
          disabled={!!initialEmployeeId}
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
        <Label htmlFor="building">Preferred Building (Optional)</Label>
        <select
          id="building"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={selectedBuildingId || ""}
          onChange={(e) => {
            const val = e.target.value;
            const bId = val ? Number(val) : undefined;
            setSelectedBuildingId(bId);
            setValue("building_id", bId);
            setValue("floor_id", undefined);
          }}
        >
          <option value="">Any Building</option>
          {buildings?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.address || "No address"})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="floor">Preferred Floor (Optional)</Label>
        <select
          id="floor"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          disabled={!selectedBuildingId}
          value={watch("floor_id") || ""}
          onChange={(e) => {
            const val = e.target.value;
            setValue("floor_id", val ? Number(val) : undefined);
          }}
        >
          <option value="">Any Floor</option>
          {floors?.map((f) => (
            <option key={f.id} value={f.id}>
              Floor {f.floor_number}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seat_type">Preferred Seat Type (Optional)</Label>
        <select
          id="seat_type"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={watch("seat_type") || ""}
          onChange={(e) => {
            const val = e.target.value;
            setValue("seat_type", val ? (val as any) : undefined);
          }}
        >
          <option value="">Any Type</option>
          <option value="standard">Standard</option>
          <option value="workstation">Workstation</option>
          <option value="cabin">Cabin</option>
          <option value="hotdesk">Hotdesk</option>
        </select>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="submit" disabled={isLoading || !selectedEmployee}>
          {isLoading ? "Finding seat..." : "Auto-allocate"}
        </Button>
      </div>
    </form>
  );
}
