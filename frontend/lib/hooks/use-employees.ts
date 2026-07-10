import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { employeeSchema } from "@/lib/zod-schemas";
import { z } from "zod";

type EmployeeInput = z.infer<typeof employeeSchema>;

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  designation: string;
  status: "active" | "on_leave" | "exited";
  joining_date: string;
  exit_date: string | null;
  reporting_manager_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_seat?: {
    id: number;
    seat_code: string;
    floor_number: number;
    building_name: string;
  } | null;
}

export interface EmployeeDetail extends Employee {
  reporting_manager?: Employee | null;
  direct_reports: Employee[];
  projects: Array<{
    project_id: number;
    project_name: string;
    project_code: string;
    role_on_project: string;
    allocation_percent: number;
    start_date: string;
    end_date: string | null;
  }>;
  assignments: Array<{
    id: number;
    seat_id: number;
    seat_code: string;
    floor_number: number;
    building_name: string;
    allocated_at: string;
    released_at: string | null;
    release_reason: string | null;
  }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function useEmployees(filters: Record<string, any>) {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, String(value));
    }
  });

  return useQuery<PaginatedResponse<Employee>>({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<Employee>>(
        `/api/v1/employees?${queryParams.toString()}`
      ),
  });
}

export function useEmployee(id: number | string) {
  return useQuery<EmployeeDetail>({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => apiClient.get<EmployeeDetail>(`/api/v1/employees/${id}`),
    enabled: !!id,
  });
}

export function useUnassignedEmployees(department?: string) {
  const path = department
    ? `/api/v1/employees/unassigned?department=${encodeURIComponent(department)}`
    : "/api/v1/employees/unassigned";
  return useQuery<Employee[]>({
    queryKey: queryKeys.employees.unassigned(),
    queryFn: () => apiClient.get<Employee[]>(path),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmployeeInput) =>
      apiClient.post<Employee>("/api/v1/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
}

export function useUpdateEmployee(id: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<EmployeeInput>) =>
      apiClient.patch<Employee>(`/api/v1/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) =>
      apiClient.delete(`/api/v1/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
}
