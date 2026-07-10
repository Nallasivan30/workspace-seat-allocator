"use client";

import * as React from "react";
import { BarChart3, PieChart, TrendingUp, Calendar, RefreshCcw } from "lucide-react";
import {
  useDepartmentsAnalytics,
  useProjectsAnalytics,
  useSeatTurnoverAnalytics,
} from "@/lib/hooks/use-dashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { KpiCard } from "@/components/shared/kpi-card";
import { BarChart } from "@/components/shared/charts/bar-chart";
import { DonutChart } from "@/components/shared/charts/donut-chart";

export default function AnalyticsPage() {
  const { data: deptData, isLoading: deptLoading } = useDepartmentsAnalytics();
  const { data: projData, isLoading: projLoading } = useProjectsAnalytics();
  const { data: turnoverData, isLoading: turnoverLoading } = useSeatTurnoverAnalytics();

  const deptColumns = [
    {
      header: "Department",
      accessorKey: "department" as const,
      cell: (row: any) => <span className="font-semibold text-zinc-900 dark:text-white">{row.department}</span>,
    },
    {
      header: "Total Staff",
      accessorKey: "total_employees" as const,
    },
    {
      header: "Assigned Seats",
      accessorKey: "allocated_employees" as const,
    },
    {
      header: "Utilization Rate",
      accessorKey: "utilization_rate" as const,
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, row.utilization_rate)}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold">{row.utilization_rate.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  const projColumns = [
    {
      header: "Project Name",
      accessorKey: "project_name" as const,
      cell: (row: any) => <span className="font-semibold text-zinc-900 dark:text-white">{row.project_name}</span>,
    },
    {
      header: "Allocated Staff",
      accessorKey: "total_allocated_employees" as const,
    },
    {
      header: "Cumulative Effort",
      accessorKey: "total_allocation_percent" as const,
      cell: (row: any) => (
        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
          {row.total_allocation_percent}%
        </span>
      ),
    },
  ];

  // Map turnover reasons to progress lists
  const turnoverReasonsList = React.useMemo(() => {
    if (!turnoverData || !turnoverData.reasons) return [];
    return Object.entries(turnoverData.reasons).map(([reason, count]) => ({
      reason: reason.replace(/_/g, " "),
      count,
    }));
  }, [turnoverData]);

  const deptChartData = React.useMemo(() => {
    if (!deptData) return [];
    return deptData.map((d) => ({
      name: d.department,
      value: Math.round(d.utilization_rate * 100) / 100,
    }));
  }, [deptData]);

  const projectChartData = React.useMemo(() => {
    if (!projData) return [];
    return projData.map((p) => ({
      name: p.project_name,
      value: p.total_allocation_percent,
    }));
  }, [projData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Workspace Analytics</h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Aggregated division usage reports, seat turnover parameters, and project allocation shares
        </p>
      </div>

      {/* Turnover KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="Total Seat Assignments"
          value={turnoverData?.total_allocated}
          icon={TrendingUp}
          description="Accumulated lifetime seat allocations"
          loading={turnoverLoading}
        />
        <KpiCard
          title="Total Releases"
          value={turnoverData?.total_released}
          icon={RefreshCcw}
          description="Accumulated vacant seats vacated"
          loading={turnoverLoading}
        />
        <KpiCard
          title="Turnover Rate"
          value={turnoverData ? `${(turnoverData.turnover_rate * 100).toFixed(1)}%` : undefined}
          icon={Calendar}
          description="Workspace change frequency rating"
          loading={turnoverLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Utilization Card */}
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Department Allocation Details</CardTitle>
            <CardDescription>Functional division utilization breakdowns</CardDescription>
          </CardHeader>
          <CardContent>
            {deptLoading ? (
              <div className="h-48 flex items-center justify-center text-zinc-500">Loading department details...</div>
            ) : (
              <DataTable
                data={deptData || []}
                columns={deptColumns}
                emptyMessage="No department analytics records found."
              />
            )}
          </CardContent>
        </Card>

        {/* Project Effort Spreads */}
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Project Allocation Shares</CardTitle>
            <CardDescription>Consolidated workforce effort shares per project</CardDescription>
          </CardHeader>
          <CardContent>
            {projLoading ? (
              <div className="h-48 flex items-center justify-center text-zinc-500">Loading project analytics...</div>
            ) : (
              <DataTable
                data={projData || []}
                columns={projColumns}
                emptyMessage="No project assignments configured."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department chart visualization */}
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Department Saturation View</CardTitle>
            <CardDescription>Visual comparison of utilization ratios across teams</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            {deptLoading ? (
              <div className="h-[250px] flex items-center justify-center text-zinc-500">Loading...</div>
            ) : (
              <DonutChart data={deptChartData} unit="%" height={250} />
            )}
          </CardContent>
        </Card>

        {/* Turnover reasons / vacation progress breakdown */}
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Vacating / Release Reasons</CardTitle>
            <CardDescription>Primary reasons provided for releasing assigned workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            {turnoverLoading ? (
              <div className="h-48 flex items-center justify-center text-zinc-500">Loading details...</div>
            ) : turnoverReasonsList.length > 0 ? (
              <div className="space-y-4 pt-2">
                {turnoverReasonsList.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300">
                        {item.reason}
                      </span>
                      <span className="font-mono text-zinc-500">
                        {item.count} {item.count === 1 ? "release" : "releases"}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{
                          width: `${
                            (item.count / (turnoverData?.total_released || 1)) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-400">
                No seat release history available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
