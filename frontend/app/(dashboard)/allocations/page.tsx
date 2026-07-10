"use client";

import * as React from "react";
import { UserCheck, UserX, Plus, Sparkles, History, CheckCircle2 } from "lucide-react";
import {
  useSeatAllocations,
  useAllocateSeat,
  useAutoAllocate,
  useReleaseSeat,
} from "@/lib/hooks/use-seats";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/data-table";
import { FormDialog } from "@/components/shared/form-dialog";
import { AllocationForm } from "@/components/shared/forms/allocation-form";
import { AutoAllocateForm } from "@/components/shared/forms/auto-allocate-form";
import { ReleaseForm } from "@/components/shared/forms/release-form";
import { useToast } from "@/components/ui/toast";

export default function AllocationsPage() {
  const { toast } = useToast();

  // Active / History query states
  const { data: activeAllocations, isLoading: activeLoading } = useSeatAllocations({ status: "active" });
  const { data: pastAllocations, isLoading: pastLoading } = useSeatAllocations({ status: "released" });

  // Dialog control states
  const [manualOpen, setManualOpen] = React.useState(false);
  const [autoOpen, setAutoOpen] = React.useState(false);
  const [releaseOpen, setReleaseOpen] = React.useState(false);
  const [selectedAllocationId, setSelectedAllocationId] = React.useState<number | null>(null);

  // Mutations
  const allocateMutation = useAllocateSeat();
  const autoAllocateMutation = useAutoAllocate();
  const releaseMutation = useReleaseSeat(selectedAllocationId || 0);

  const handleManualAllocate = async (data: any) => {
    try {
      await allocateMutation.mutateAsync({
        employee_id: data.employee_id,
        seat_id: data.seat_id,
      });

      toast({
        title: "Seat Allocated",
        description: "Successfully assigned employee to workspace.",
        type: "success",
      });
      setManualOpen(false);
    } catch (err: any) {
      toast({
        title: "Allocation Failed",
        description: err.message || "Failed to allocate seat.",
        type: "error",
      });
    }
  };

  const handleAutoAllocate = async (data: any) => {
    try {
      const response = await autoAllocateMutation.mutateAsync({
        employee_id: data.employee_id,
        building_id: data.building_id || undefined,
        floor_id: data.floor_id || undefined,
        seat_type: data.seat_type || undefined,
      });

      toast({
        title: "AI Auto-Allocation Complete",
        description: `Successfully allocated seat ${response.seat_code} to employee.`,
        type: "success",
      });
      setAutoOpen(false);
    } catch (err: any) {
      toast({
        title: "Auto-Allocation Failed",
        description: err.message || "No suitable available seat matches criteria.",
        type: "error",
      });
    }
  };

  const handleReleaseAllocation = async (data: any) => {
    try {
      await releaseMutation.mutateAsync({
        reason: data.reason,
        notes: data.notes,
      });

      toast({
        title: "Seat Released",
        description: "Vacated workspace allocation successfully.",
        type: "success",
      });
      setReleaseOpen(false);
      setSelectedAllocationId(null);
    } catch (err: any) {
      toast({
        title: "Release Failed",
        description: err.message || "Failed to release allocation.",
        type: "error",
      });
    }
  };

  const activeColumns = [
    {
      header: "Employee",
      accessorKey: "employee_name" as const,
      cell: (row: any) =>
        row.employee ? (
          <div className="flex flex-col">
            <span className="font-semibold text-zinc-900 dark:text-white">
              {row.employee.first_name} {row.employee.last_name}
            </span>
            <span className="text-[10px] text-zinc-500">{row.employee.department}</span>
          </div>
        ) : (
          <span className="text-zinc-500">Unknown Employee</span>
        ),
    },
    {
      header: "Seat Code",
      accessorKey: "seat_code" as const,
      cell: (row: any) => (
        <span className="font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded text-xs">
          {row.seat_code}
        </span>
      ),
    },
    {
      header: "Location",
      accessorKey: "building_name" as const,
      cell: (row: any) => {
        const bName = row.building_name || row.seat?.floor?.building?.name;
        const fNum = row.floor_number ?? row.seat?.floor?.floor_number;
        return `${bName || "Unknown Building"}, Floor ${fNum ?? "Unknown Floor"}`;
      },
    },
    {
      header: "Allocated At",
      accessorKey: "allocated_at" as const,
      cell: (row: any) => {
        const dateVal = row.allocated_at || row.assigned_at;
        return dateVal ? new Date(dateVal).toLocaleDateString() : "N/A";
      },
    },
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (row: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedAllocationId(row.id);
            setReleaseOpen(true);
          }}
          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 dark:border-zinc-800 dark:hover:bg-red-950/20"
        >
          <UserX className="h-3 w-3" />
          Release Seat
        </Button>
      ),
    },
  ];

  const pastColumns = [
    {
      header: "Employee",
      accessorKey: "employee_name" as const,
      cell: (row: any) =>
        row.employee ? (
          <div className="flex flex-col">
            <span className="font-semibold text-zinc-900 dark:text-white">
              {row.employee.first_name} {row.employee.last_name}
            </span>
            <span className="text-[10px] text-zinc-500">{row.employee.department}</span>
          </div>
        ) : (
          <span className="text-zinc-500">Unknown Employee</span>
        ),
    },
    {
      header: "Seat Code",
      accessorKey: "seat_code" as const,
      cell: (row: any) => (
        <span className="font-mono font-bold uppercase text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">
          {row.seat_code}
        </span>
      ),
    },
    {
      header: "Release Reason",
      accessorKey: "release_reason" as const,
      cell: (row: any) => (
        <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300">
          {row.release_reason?.replace(/_/g, " ") || "No reason"}
        </span>
      ),
    },
    {
      header: "Allocated Date",
      accessorKey: "allocated_at" as const,
      cell: (row: any) => {
        const dateVal = row.allocated_at || row.assigned_at;
        return dateVal ? new Date(dateVal).toLocaleDateString() : "N/A";
      },
    },
    {
      header: "Released Date",
      accessorKey: "released_at" as const,
      cell: (row: any) => {
        return row.released_at ? new Date(row.released_at).toLocaleDateString() : "N/A";
      },
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Workspace Assignments</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Control employee seat mappings, manual leases, and run AI auto-allocation suggestions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-1.5 border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
          >
            <UserCheck className="h-4 w-4" />
            Manual Allocate
          </Button>
          <Button
            onClick={() => setAutoOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Sparkles className="h-4 w-4" />
            Auto-Allocate (AI)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full space-y-4">
        <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg">
          <TabsTrigger value="active" className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2">
            <CheckCircle2 className="h-4 w-4" />
            Active Occupancy
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2">
            <History className="h-4 w-4" />
            Allocation History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Active Allocations</CardTitle>
              <CardDescription>Current live seat mappings mapped to employee accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {activeLoading ? (
                <div className="h-48 flex items-center justify-center text-zinc-500">Loading occupancy lists...</div>
              ) : (
                <DataTable
                  data={activeAllocations || []}
                  columns={activeColumns}
                  emptyMessage="No workspaces are currently occupied."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Historical Allocation Audit Log</CardTitle>
              <CardDescription>Full timeline of completed/released workspace mappings</CardDescription>
            </CardHeader>
            <CardContent>
              {pastLoading ? (
                <div className="h-48 flex items-center justify-center text-zinc-500">Loading audit history...</div>
              ) : (
                <DataTable
                  data={pastAllocations || []}
                  columns={pastColumns}
                  emptyMessage="No released workspace allocation logs."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Allocation Dialog */}
      <FormDialog
        isOpen={manualOpen}
        onOpenChange={setManualOpen}
        title="Manual Workspace Assignment"
        description="Select an unassigned employee and map them directly to an available seat."
      >
        <AllocationForm onSubmit={handleManualAllocate} isLoading={allocateMutation.isPending} />
      </FormDialog>

      {/* Auto Allocation Dialog */}
      <FormDialog
        isOpen={autoOpen}
        onOpenChange={setAutoOpen}
        title="AI Auto-Allocation Wizard"
        description="Enter criteria parameters and matching algorithm will select an ideal vacant seat."
      >
        <AutoAllocateForm onSubmit={handleAutoAllocate} isLoading={autoAllocateMutation.isPending} />
      </FormDialog>

      {/* Release Confirmation Dialog */}
      <FormDialog
        isOpen={releaseOpen}
        onOpenChange={(open) => {
          setReleaseOpen(open);
          if (!open) setSelectedAllocationId(null);
        }}
        title="Confirm Seat Vacancy Release"
        description="Please confirm vacating this workspace and specify reason category for turnover tracking."
      >
        <ReleaseForm onSubmit={handleReleaseAllocation} isLoading={releaseMutation.isPending} />
      </FormDialog>
    </div>
  );
}
