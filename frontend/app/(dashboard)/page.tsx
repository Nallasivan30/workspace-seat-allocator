"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Grid,
  Percent,
  Briefcase,
  AlertTriangle,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  useDashboardSummary,
  useFloorUtilization,
  useDepartmentsAnalytics,
} from "@/lib/hooks/use-dashboard";
import { useEmployees, useUpdateEmployee } from "@/lib/hooks/use-employees";
import { useAutoAllocate } from "@/lib/hooks/use-seats";
import { KpiCard } from "@/components/shared/kpi-card";
import { BarChart } from "@/components/shared/charts/bar-chart";
import { DonutChart } from "@/components/shared/charts/donut-chart";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { FormDialog } from "@/components/shared/form-dialog";
import { AutoAllocateForm } from "@/components/shared/forms/auto-allocate-form";

export default function DashboardHome() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedEmpForAllocation, setSelectedEmpForAllocation] = React.useState<number | null>(null);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: floorUtil, isLoading: floorsLoading } = useFloorUtilization();
  const { data: deptUtil, isLoading: deptLoading } = useDepartmentsAnalytics();
  const { data: unassignedData, isLoading: unassignedLoading } = useEmployees({
    status: "active",
    has_seat: false,
    page_size: 5,
  });

  // Mutation for auto-allocate
  const autoAllocateMutation = useAutoAllocate();

  const handleAutoAllocate = async (data: any) => {
    try {
      const response = await autoAllocateMutation.mutateAsync({
        employee_id: data.employee_id,
        building_id: data.building_id,
        floor_id: data.floor_id,
        seat_type: data.seat_type,
      });

      toast({
        title: "Seat Allocated",
        description: `Successfully allocated seat ${response.seat_code} to employee.`,
        type: "success",
      });
      setSelectedEmpForAllocation(null);
    } catch (err: any) {
      toast({
        title: "Allocation Failed",
        description: err.message || "Failed to auto-allocate seat.",
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
      header: "Department",
      accessorKey: "department" as const,
    },
    {
      header: "Designation",
      accessorKey: "designation" as const,
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      accessorKey: "action" as const,
      cell: (row: any) => (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 text-xs border-indigo-200/80 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-zinc-800"
          onClick={() => setSelectedEmpForAllocation(row.id)}
        >
          <UserCheck className="h-3 w.5" />
          Assign Seat
        </Button>
      ),
    },
  ];

  // Map floor utilization to chart data
  const floorChartData = React.useMemo(() => {
    if (!floorUtil) return [];
    return floorUtil.map((f) => ({
      name: `${f.building_name} F${f.floor_number}`,
      value: Math.round(f.utilization_rate * 100) / 100,
    }));
  }, [floorUtil]);

  // Map department utilization to chart data
  const deptChartData = React.useMemo(() => {
    if (!deptUtil) return [];
    return deptUtil.map((d) => ({
      name: d.department,
      value: Math.round(d.utilization_rate * 100) / 100,
    }));
  }, [deptUtil]);

  const showHighUtilizationAlert = summary && summary.utilization_rate >= 85;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Workspace Overview</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Real-time insights and management dashboard for seat capacities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => router.push("/seats")}
          >
            <Grid className="h-4 w-4" />
            Manage Seat Layouts
          </Button>
        </div>
      </div>

      {/* High Utilization Alert Banner */}
      {showHighUtilizationAlert && (
        <div className="flex items-start gap-3.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold">High Workspace Utilization Alert</h4>
            <p className="opacity-90">
              Workspace utilization has reached {summary?.utilization_rate?.toFixed(1)}%. We recommend identifying unused reserve capacity or planning seat reallocations.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Employees"
          value={summary?.total_employees}
          icon={Users}
          description="Active and registered profiles"
          loading={summaryLoading}
        />
        <KpiCard
          title="Total Workspaces"
          value={summary?.total_seats}
          icon={Grid}
          description={`${summary?.allocated_seats || 0} currently occupied`}
          loading={summaryLoading}
        />
        <KpiCard
          title="Utilization Rate"
          value={summary ? `${summary.utilization_rate.toFixed(1)}%` : undefined}
          icon={Percent}
          description="Target utilization: 75% - 85%"
          loading={summaryLoading}
        />
        <KpiCard
          title="Unassigned Staff"
          value={summary?.unassigned_employees}
          icon={Briefcase}
          description="Awaiting workspace seat allocation"
          loading={summaryLoading}
        />
      </div>

      {/* Visualization Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Floor-by-Floor Utilization</CardTitle>
            <CardDescription>Capacity usage percentages across buildings and floors</CardDescription>
          </CardHeader>
          <CardContent>
            {floorsLoading ? (
              <div className="h-[300px] flex items-center justify-center text-xs text-zinc-500">Loading chart...</div>
            ) : (
              <BarChart data={floorChartData} unit="%" height={300} color="#6366f1" />
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Department-Wise Utilization</CardTitle>
            <CardDescription>Average allocation saturation for each functional division</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            {deptLoading ? (
              <div className="h-[300px] flex items-center justify-center text-xs text-zinc-500">Loading chart...</div>
            ) : (
              <div className="w-full">
                <DonutChart data={deptChartData} unit="%" height={300} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Employees Panel */}
      <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Unassigned Employees</CardTitle>
            <CardDescription>Active team members who do not have an assigned workspace seat</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/employees?has_seat=false")}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View all unassigned
          </Button>
        </CardHeader>
        <CardContent>
          {unassignedLoading ? (
            <div className="flex h-32 items-center justify-center text-zinc-500">Loading data...</div>
          ) : (
            <DataTable
              data={unassignedData?.items || []}
              columns={columns}
              emptyMessage="All active employees have been assigned a seat."
            />
          )}
        </CardContent>
      </Card>

      {/* Auto-allocation Modal Dialog */}
      <FormDialog
        isOpen={selectedEmpForAllocation !== null}
        onOpenChange={(open) => !open && setSelectedEmpForAllocation(null)}
        title="Auto-Allocate Workspace Seat"
        description="Let the AI matching assistant find and allocate the most optimal available workspace for this employee."
      >
        {selectedEmpForAllocation && (
          <AutoAllocateForm
            initialEmployeeId={selectedEmpForAllocation}
            onSubmit={handleAutoAllocate}
            isLoading={autoAllocateMutation.isPending}
          />
        )}
      </FormDialog>
    </div>
  );
}
