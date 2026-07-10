"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearch } from "@/lib/hooks/use-search";
import { Search, Users, Briefcase, Grid, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const { data: results, isLoading } = useSearch(query);

  const employeeColumns = [
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
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      accessorKey: "action" as const,
      cell: () => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/employees")}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
        >
          View in directory
          <ArrowRight className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  const projectColumns = [
    {
      header: "Project Code",
      accessorKey: "project_code" as const,
      cell: (row: any) => (
        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-semibold">
          {row.project_code}
        </span>
      ),
    },
    {
      header: "Project Name",
      accessorKey: "project_name" as const,
      cell: (row: any) => <span className="font-semibold">{row.project_name}</span>,
    },
    {
      header: "Client Name",
      accessorKey: "client_name" as const,
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      accessorKey: "action" as const,
      cell: () => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/projects")}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
        >
          Inspect details
          <ArrowRight className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  const seatColumns = [
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
      cell: (row: any) => `${row.building_name || "N/A"}, Floor ${row.floor_number || "N/A"}`,
    },
    {
      header: "Seat Type",
      accessorKey: "seat_type" as const,
      cell: (row: any) => <span className="capitalize font-medium">{row.seat_type}</span>,
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      accessorKey: "action" as const,
      cell: () => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/seats")}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
        >
          View Seat Map
          <ArrowRight className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  if (!query || query.length < 2) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Global Search</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Search system profiles, locations, and seating layouts</p>
        </div>
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800 p-12 text-center flex flex-col items-center justify-center gap-2">
          <Search className="h-10 w-10 text-zinc-300" />
          <h3 className="font-semibold text-zinc-900 dark:text-white">Query is too short</h3>
          <p className="text-xs text-zinc-500 max-w-sm">Please type at least 2 characters in the top search bar to begin scanning.</p>
        </Card>
      </div>
    );
  }

  const hasEmployees = results && results.employees.length > 0;
  const hasProjects = results && results.projects.length > 0;
  const hasSeats = results && results.seats.length > 0;
  const hasAnyResults = hasEmployees || hasProjects || hasSeats;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Search Results for &ldquo;{query}&rdquo;
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Showing matching results from employees, projects, and floor mappings
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-zinc-500">Scanning databases...</div>
      ) : !hasAnyResults ? (
        <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800 p-12 text-center flex flex-col items-center justify-center gap-2">
          <Search className="h-10 w-10 text-zinc-300" />
          <h3 className="font-semibold text-zinc-900 dark:text-white">No results found</h3>
          <p className="text-xs text-zinc-500 max-w-sm">
            We couldn&apos;t find any records matching your search query. Check spelling or try a different term.
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full space-y-4">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-lg">
            <TabsTrigger value="all" className="text-xs font-semibold px-4 py-2">
              All Results
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2">
              <Users className="h-3.5 w-3.5" />
              Employees ({results?.employees.length || 0})
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2">
              <Briefcase className="h-3.5 w-3.5" />
              Projects ({results?.projects.length || 0})
            </TabsTrigger>
            <TabsTrigger value="seats" className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2">
              <Grid className="h-3.5 w-3.5" />
              Workspaces ({results?.seats.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {hasEmployees && (
              <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Employees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable data={results!.employees} columns={employeeColumns} />
                </CardContent>
              </Card>
            )}

            {hasProjects && (
              <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-indigo-600" />
                    Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable data={results!.projects} columns={projectColumns} />
                </CardContent>
              </Card>
            )}

            {hasSeats && (
              <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Grid className="h-4 w-4 text-indigo-600" />
                    Workspaces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable data={results!.seats} columns={seatColumns} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="employees">
            <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>Matching Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={results?.employees || []}
                  columns={employeeColumns}
                  emptyMessage="No employees matched."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>Matching Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={results?.projects || []}
                  columns={projectColumns}
                  emptyMessage="No projects matched."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seats">
            <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>Matching Workspaces</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={results?.seats || []}
                  columns={seatColumns}
                  emptyMessage="No workspaces matched."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
