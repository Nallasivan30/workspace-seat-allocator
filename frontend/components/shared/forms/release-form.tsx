"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { seatReleaseSchema } from "@/lib/zod-schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type ReleaseFormData = z.infer<typeof seatReleaseSchema>;

interface ReleaseFormProps {
  onSubmit: (data: ReleaseFormData) => void;
  isLoading?: boolean;
}

export function ReleaseForm({
  onSubmit,
  isLoading = false,
}: ReleaseFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReleaseFormData>({
    resolver: zodResolver(seatReleaseSchema),
    defaultValues: {
      reason: "other",
      notes: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Release</Label>
        <select
          id="reason"
          className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:focus:ring-zinc-300"
          defaultValue="other"
          onChange={(e) => setValue("reason", e.target.value as any)}
        >
          <option value="resigned">Resigned</option>
          <option value="relocated">Relocated</option>
          <option value="project_change">Project Change</option>
          <option value="other">Other</option>
        </select>
        {errors.reason && (
          <p className="text-xs text-red-500">{errors.reason.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes / Details (Optional)</Label>
        <Input
          id="notes"
          placeholder="e.g. Employee moving to new office space"
          {...register("notes")}
        />
        {errors.notes && (
          <p className="text-xs text-red-500">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700">
          {isLoading ? "Releasing..." : "Release Seat"}
        </Button>
      </div>
    </form>
  );
}
