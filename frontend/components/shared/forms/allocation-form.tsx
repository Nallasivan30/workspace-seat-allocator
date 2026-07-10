"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { seatAllocationSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useAvailableSeats } from "@/lib/hooks/use-seats";

type AllocationFormData = z.infer<typeof seatAllocationSchema>;

interface AllocationFormProps {
  initialEmployeeId?: number;
  initialSeatId?: number;
  onSubmit: (data: AllocationFormData) => void;
  isLoading?: boolean;
}

export function AllocationForm({
  initialEmployeeId,
  initialSeatId,
  onSubmit,
  isLoading = false,
}: AllocationFormProps) {
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AllocationFormData>({
    resolver: zodResolver(seatAllocationSchema),
    defaultValues: {
      employee_id: initialEmployeeId || 0,
      seat_id: initialSeatId || 0,
      notes: "",
    },
  });

  // Query unassigned/active employees
  const { data: employeesData } = useEmployees({ status: "active", has_seat: false, page_size: 100 });
  const employees = employeesData?.items || [];

  // Query available seats
  const { data: availableSeats } = useAvailableSeats();

  const selectedEmployee = watch("employee_id");
  const selectedSeat = watch("seat_id");

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
        <Label htmlFor="seat_id">Available Seat</Label>
        <select
          id="seat_id"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={selectedSeat || ""}
          disabled={!!initialSeatId}
          onChange={(e) => setValue("seat_id", Number(e.target.value))}
        >
          <option value="0">Select Seat</option>
          {availableSeats?.map((seat) => (
            <option key={seat.id} value={seat.id}>
              {seat.seat_code} - {seat.building?.name || "Unknown Building"}, Floor {seat.floor?.floor_number ?? "Unknown Floor"} ({seat.seat_type})
            </option>
          ))}
        </select>
        {errors.seat_id && (
          <p className="text-xs text-red-500">Please select a seat</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="submit" disabled={isLoading || !selectedEmployee || !selectedSeat}>
          {isLoading ? "Allocating..." : "Allocate Seat"}
        </Button>
      </div>
    </form>
  );
}
