import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { projectSchema } from "@/lib/zod-schemas";
import { z } from "zod";

type ProjectInput = z.infer<typeof projectSchema>;

export interface Project {
  id: number;
  name: string;
  project_name?: string;
  project_code: string;
  client_name: string;
  start_date: string;
  end_date: string | null;
  status: "pipeline" | "active" | "completed" | "suspended";
  color_code?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectEmployeeAllocation {
  id: number;
  employee_id: number;
  project_id: number;
  role_on_project: string;
  allocation_percent: number;
  start_date: string;
  end_date: string | null;
  warning?: string | null;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    designation: string;
  };
}

export interface ProjectDetail extends Project {
  employees: ProjectEmployeeAllocation[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ProjectEmployeeAssignInput {
  employee_id: number;
  role_on_project: string;
  allocation_percent: number;
  start_date: string;
  end_date?: string | null;
}

export function useProjects(filters: Record<string, any> = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, String(value));
    }
  });

  return useQuery<PaginatedResponse<Project>>({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Project>>(
        `/api/v1/projects?${queryParams.toString()}`
      ),
  });
}

export function useProject(id: number | string) {
  return useQuery<ProjectDetail>({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => apiClient.get<ProjectDetail>(`/api/v1/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectInput) =>
      apiClient.post<Project>("/api/v1/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
    },
  });
}

export function useUpdateProject(id: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ProjectInput>) =>
      apiClient.patch<Project>(`/api/v1/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) =>
      apiClient.delete(`/api/v1/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
    },
  });
}

export function useAssignEmployeeToProject(projectId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProjectEmployeeAssignInput) =>
      apiClient.post<ProjectEmployeeAllocation>(
        `/api/v1/projects/${projectId}/employees`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
}

export function useRemoveEmployeeFromProject(projectId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: number | string) =>
      apiClient.delete(`/api/v1/projects/${projectId}/employees/${employeeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
}
