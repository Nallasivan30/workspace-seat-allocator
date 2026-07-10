import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface DashboardSummary {
  total_employees: number;
  total_seats: number;
  allocated_seats: number;
  available_seats: number;
  utilization_rate: number;
  active_projects: number;
  unassigned_employees: number;
}

export interface FloorUtilization {
  floor_id: number;
  floor_number: number;
  building_name: string;
  total_seats: number;
  allocated_seats: number;
  utilization_rate: number;
}

export interface ProjectAnalytics {
  project_id: number;
  project_name: string;
  total_allocated_employees: number;
  total_allocation_percent: number;
}

export interface DepartmentAnalytics {
  department: string;
  total_employees: number;
  allocated_employees: number;
  utilization_rate: number;
}

export interface SeatTurnover {
  total_allocated: number;
  total_released: number;
  turnover_rate: number;
  reasons: Record<string, number>;
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiClient.get<DashboardSummary>("/api/v1/dashboard/summary"),
  });
}

export function useFloorUtilization() {
  return useQuery<FloorUtilization[]>({
    queryKey: ["dashboard", "utilization"],
    queryFn: () => apiClient.get<FloorUtilization[]>("/api/v1/dashboard/utilization"),
  });
}

export function useProjectsAnalytics() {
  return useQuery<ProjectAnalytics[]>({
    queryKey: ["analytics", "projects"],
    queryFn: () => apiClient.get<ProjectAnalytics[]>("/api/v1/analytics/projects"),
  });
}

export function useDepartmentsAnalytics() {
  return useQuery<DepartmentAnalytics[]>({
    queryKey: ["analytics", "departments"],
    queryFn: () => apiClient.get<DepartmentAnalytics[]>("/api/v1/analytics/departments"),
  });
}

export function useSeatTurnoverAnalytics(startDate?: string, endDate?: string) {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set("start_date", startDate);
  if (endDate) queryParams.set("end_date", endDate);

  const key = ["analytics", "seat-turnover", startDate, endDate];
  return useQuery<SeatTurnover>({
    queryKey: key,
    queryFn: () =>
      apiClient.get<SeatTurnover>(
        `/api/v1/analytics/seat-turnover?${queryParams.toString()}`
      ),
  });
}
