"use client";

import * as React from "react";
import {
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  AlertTriangle,
  FolderDot,
  Calendar,
  Percent,
} from "lucide-react";
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useAssignEmployeeToProject,
  useRemoveEmployeeFromProject,
} from "@/lib/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormDialog } from "@/components/shared/form-dialog";
import { ProjectForm } from "@/components/shared/forms/project-form";
import { AssignProjectForm } from "@/components/shared/forms/assign-project-form";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/shared/data-table";

export default function ProjectsPage() {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null);

  // Dialog controls
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [selectedProjectData, setSelectedProjectData] = React.useState<any | null>(null);

  // API hooks
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const projects = projectsData?.items || [];
  const { data: projectDetail, isLoading: allocLoading } = useProject(selectedProjectId || 0);
  const allocations = projectDetail?.employees || [];

  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(selectedProjectData?.id || "");
  const deleteMutation = useDeleteProject();

  const assignMutation = useAssignEmployeeToProject(selectedProjectId || 0);
  const removeMutation = useRemoveEmployeeFromProject(selectedProjectId || 0);

  // Select first project on load
  React.useEffect(() => {
    if (projects && projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const activeProject = React.useMemo(() => {
    return projects?.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Check allocation overflow warnings
  const totalAllocationVal = React.useMemo(() => {
    if (!allocations) return 0;
    return allocations.reduce((acc, curr) => acc + curr.allocation_percent, 0);
  }, [allocations]);

  const handleCreateProject = async (data: any) => {
    try {
      const response = await createMutation.mutateAsync(data);
      toast({
        title: "Project Created",
        description: "Successfully registered new project profile.",
        type: "success",
      });
      setCreateDialogOpen(false);
      setSelectedProjectId(response.id);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to create project.",
        type: "error",
      });
    }
  };

  const handleUpdateProject = async (data: any) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({
        title: "Project Updated",
        description: "Successfully updated project details.",
        type: "success",
      });
      setEditDialogOpen(false);
      setSelectedProjectData(null);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to update project.",
        type: "error",
      });
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project? This will remove all associated allocations.")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "Project Deleted",
        description: "Successfully removed project.",
        type: "success",
      });
      setSelectedProjectId(null);
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to delete project.",
        type: "error",
      });
    }
  };

  const handleAssignEmployee = async (data: any) => {
    try {
      await assignMutation.mutateAsync({
        employee_id: data.employee_id,
        role_on_project: data.role_on_project,
        allocation_percent: data.allocation_percent,
        start_date: data.start_date,
        end_date: data.end_date || null,
      });

      toast({
        title: "Employee Assigned",
        description: "Successfully mapped employee to the project.",
        type: "success",
      });
      setAssignDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.message || "Failed to assign employee to project.",
        type: "error",
      });
    }
  };

  const handleRemoveEmployee = async (employeeId: number) => {
    if (!confirm("Are you sure you want to remove this employee from the project?")) return;
    try {
      await removeMutation.mutateAsync(employeeId);
      toast({
        title: "Employee Removed",
        description: "Successfully removed employee assignment.",
        type: "success",
      });
    } catch (err: any) {
      toast({
        title: "Action Failed",
        description: err.message || "Failed to remove employee assignment.",
        type: "error",
      });
    }
  };

  const allocationColumns = [
    {
      header: "Employee",
      accessorKey: "employee" as const,
      cell: (row: any) => `${row.employee.first_name} ${row.employee.last_name}`,
    },
    {
      header: "Role",
      accessorKey: "role_on_project" as const,
    },
    {
      header: "Allocation",
      accessorKey: "allocation_percent" as const,
      cell: (row: any) => (
        <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
          {row.allocation_percent}%
        </span>
      ),
    },
    {
      header: "Dates",
      accessorKey: "start_date" as const,
      cell: (row: any) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {row.start_date} to {row.end_date || "Present"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessorKey: "actions" as const,
      cell: (row: any) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemoveEmployee(row.employee_id)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          title="Remove from project"
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Projects Directory</h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Create projects, manage team allocations, and monitor workspace assignments
          </p>
        </div>
        <Button
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Project
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Project List card (Left Pane) */}
        <Card className="lg:col-span-1 border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Select a project to view allocations</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {projectsLoading ? (
              <div className="p-8 text-center text-sm text-zinc-500">Loading projects...</div>
            ) : projects && projects.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
                {projects.map((project) => {
                  const isSelected = project.id === selectedProjectId;
                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full text-left p-4 flex flex-col gap-1 transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                        isSelected
                          ? "bg-indigo-50/50 border-l-4 border-indigo-600 dark:bg-indigo-950/20"
                          : "border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-white truncate">
                          {project.name}
                        </span>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                          {project.project_code}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-zinc-500">No projects registered yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Project Detail card (Right Pane) */}
        <Card className="lg:col-span-2 border-zinc-200/80 shadow-sm dark:border-zinc-800">
          {activeProject ? (
            <>
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{activeProject.name}</CardTitle>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: activeProject.color_code || "#6366f1" }}
                    />
                  </div>
                  <CardDescription className="font-mono text-xs">
                    CODE: {activeProject.project_code} | STATUS: {activeProject.status.toUpperCase()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-xs"
                    onClick={() => {
                      setSelectedProjectData(activeProject);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                    onClick={() => handleDeleteProject(activeProject.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Description</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {activeProject.description || "No description provided for this project."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Assigned Team Members</h4>
                      <p className="text-xs text-zinc-500">Employee utilization splits mapped to this project</p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50/50 dark:border-zinc-800"
                      onClick={() => setAssignDialogOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Assign Member
                    </Button>
                  </div>

                  {/* High total allocation notification */}
                  {totalAllocationVal > 100 && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-semibold">Cumulative Allocation Exceeds 100%</p>
                        <p className="opacity-90">
                          Total allocated effort mapped to this project is {totalAllocationVal}%. Check assignment ratios.
                        </p>
                      </div>
                    </div>
                  )}

                  {allocLoading ? (
                    <div className="h-32 flex items-center justify-center text-xs text-zinc-500">Loading assignments...</div>
                  ) : (
                    <DataTable
                      data={allocations || []}
                      columns={allocationColumns}
                      emptyMessage="No employees are currently assigned to this project."
                    />
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <div className="p-12 text-center text-zinc-500">
              Select or create a project profile to begin.
            </div>
          )}
        </Card>
      </div>

      {/* Create project dialog */}
      <FormDialog
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Create New Project"
        description="Establish a new project category for resource mapping."
      >
        <ProjectForm onSubmit={handleCreateProject} isLoading={createMutation.isPending} />
      </FormDialog>

      {/* Edit project dialog */}
      <FormDialog
        isOpen={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedProjectData(null);
        }}
        title="Edit Project Details"
        description="Update project name, description, status, or design label colors."
      >
        {selectedProjectData && (
          <ProjectForm
            initialData={selectedProjectData}
            onSubmit={handleUpdateProject}
            isLoading={updateMutation.isPending}
          />
        )}
      </FormDialog>

      {/* Assign employee to project dialog */}
      <FormDialog
        isOpen={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        title="Assign Employee to Project"
        description="Add a team member to this project with defined allocation parameters."
      >
        <AssignProjectForm
          onSubmit={handleAssignEmployee}
          isLoading={assignMutation.isPending}
        />
      </FormDialog>
    </div>
  );
}
