"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { seatSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBuildings, useBuildingFloors } from "@/lib/hooks/use-seats";

type SeatFormData = z.infer<typeof seatSchema>;

interface SeatFormProps {
  initialData?: Partial<SeatFormData> & { building_id?: number };
  onSubmit: (data: SeatFormData) => void;
  isLoading?: boolean;
}

export function SeatForm({
  initialData,
  onSubmit,
  isLoading = false,
}: SeatFormProps) {
  const [selectedBuildingId, setSelectedBuildingId] = React.useState<number | undefined>(
    initialData?.building_id
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SeatFormData>({
    resolver: zodResolver(seatSchema),
    defaultValues: {
      floor_id: initialData?.floor_id || 0,
      seat_code: initialData?.seat_code || "",
      seat_type: initialData?.seat_type || "standard",
    },
  });

  const { data: buildings } = useBuildings();
  const { data: floors } = useBuildingFloors(selectedBuildingId);

  React.useEffect(() => {
    if (initialData?.floor_id && floors && floors.length > 0) {
      setValue("floor_id", initialData.floor_id);
    }
  }, [floors, initialData?.floor_id, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="building">Building</Label>
        <select
          id="building"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          value={selectedBuildingId || ""}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedBuildingId(val ? Number(val) : undefined);
            setValue("floor_id", 0); // reset floor
          }}
        >
          <option value="">Select a Building</option>
          {buildings?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.address || "No address"})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="floor_id">Floor</Label>
        <select
          id="floor_id"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          disabled={!selectedBuildingId}
          {...register("floor_id", { valueAsNumber: true })}
        >
          <option value="0">Select a Floor</option>
          {floors?.map((f) => (
            <option key={f.id} value={f.id}>
              Floor {f.floor_number} (Max Seats: {f.max_seats})
            </option>
          ))}
        </select>
        {errors.floor_id && (
          <p className="text-xs text-red-500">{"Please select a valid floor"}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="seat_code">Seat Code</Label>
        <Input
          id="seat_code"
          placeholder="SEAT-A-101"
          disabled={!!initialData?.seat_code}
          {...register("seat_code")}
        />
        {errors.seat_code && (
          <p className="text-xs text-red-500">{errors.seat_code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="seat_type">Seat Type</Label>
        <select
          id="seat_type"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          defaultValue={initialData?.seat_type || "standard"}
          onChange={(e) => setValue("seat_type", e.target.value as any)}
        >
          <option value="standard">Standard</option>
          <option value="workstation">Workstation</option>
          <option value="cabin">Cabin</option>
          <option value="hotdesk">Hotdesk</option>
        </select>
        {errors.seat_type && (
          <p className="text-xs text-red-500">{errors.seat_type.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="submit" disabled={isLoading || watch("floor_id") === 0}>
          {isLoading ? "Saving..." : "Save Seat"}
        </Button>
      </div>
    </form>
  );
}
