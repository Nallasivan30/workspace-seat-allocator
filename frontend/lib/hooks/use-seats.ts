import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { seatSchema } from "@/lib/zod-schemas";
import { z } from "zod";

type SeatInput = z.infer<typeof seatSchema>;

export interface Building {
  id: number;
  name: string;
  building_name?: string;
  address?: string;
  location?: string;
}

export interface Floor {
  id: number;
  floor_number: number;
  building_id: number;
  max_seats?: number;
  total_seats?: number;
}

export interface Seat {
  id: number;
  seat_code: string;
  floor_id: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  seat_type: "standard" | "premium" | "hotdesk" | "collab";
  created_at: string;
  updated_at: string;
  floor_number?: number;
  building_name?: string;
  building_id?: number;
  floor?: Floor;
  building?: Building;
}

export interface SeatAssignment {
  id: number;
  employee_id: number;
  seat_id: number;
  allocated_at: string;
  released_at: string | null;
  release_reason: string | null;
  release_notes: string | null;
  seat_code: string;
  floor_number: number;
  building_name: string;
  employee_name?: string;
  employee_code?: string;
  employee_department?: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    designation: string;
  };
}

export interface SeatDetail extends Seat {
  floor: Floor;
  building: Building;
  current_assignment: SeatAssignment | null;
  history: SeatAssignment[];
}

export interface AllocateSeatInput {
  employee_id: number;
  seat_id: number;
  allocation_type?: string;
  effective_date?: string;
}

export interface AutoAllocateInput {
  employee_id: number;
  building_id?: number;
  floor_id?: number;
  seat_type?: string;
}

export interface ReleaseSeatInput {
  reason: string;
  notes?: string;
}

export function useBuildings() {
  return useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: () => apiClient.get<Building[]>("/api/v1/buildings"),
  });
}

export function useBuildingFloors(buildingId: number | string | undefined) {
  return useQuery<Floor[]>({
    queryKey: ["buildings", buildingId, "floors"],
    queryFn: () => apiClient.get<Floor[]>(`/api/v1/buildings/${buildingId}/floors`),
    enabled: !!buildingId,
  });
}

export function useSeats(filters: Record<string, any> = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, String(value));
    }
  });

  return useQuery<Seat[]>({
    queryKey: queryKeys.seats.list(filters),
    queryFn: () => apiClient.get<Seat[]>(`/api/v1/seats?${queryParams.toString()}`),
  });
}

export function useAvailableSeats(filters: Record<string, any> = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, String(value));
    }
  });

  return useQuery<Seat[]>({
    queryKey: queryKeys.seats.available(filters),
    queryFn: () =>
      apiClient.get<Seat[]>(`/api/v1/seats/available?${queryParams.toString()}`),
  });
}

export function useSeat(id: number | string) {
  return useQuery<SeatDetail>({
    queryKey: queryKeys.seats.detail(id),
    queryFn: () => apiClient.get<SeatDetail>(`/api/v1/seats/${id}`),
    enabled: !!id,
  });
}

export function useCreateSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SeatInput) => apiClient.post<Seat>("/api/v1/seats", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.all() });
    },
  });
}

export function useUpdateSeat(id: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SeatInput>) =>
      apiClient.patch<Seat>(`/api/v1/seats/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.detail(id) });
    },
  });
}

export function useDeleteSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => apiClient.delete(`/api/v1/seats/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.all() });
    },
  });
}

export function useSeatAllocations(filters: Record<string, any> = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.set(key, String(value));
    }
  });

  return useQuery<SeatAssignment[]>({
    queryKey: ["seat-allocations", filters],
    queryFn: () =>
      apiClient.get<SeatAssignment[]>(`/api/v1/seat-allocations?${queryParams.toString()}`),
  });
}

export function useAllocateSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AllocateSeatInput) =>
      apiClient.post<SeatAssignment>("/api/v1/seat-allocations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
      queryClient.invalidateQueries({ queryKey: ["seat-allocations"] });
    },
  });
}

export function useAutoAllocate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutoAllocateInput) =>
      apiClient.post<SeatAssignment>("/api/v1/seat-allocations/auto-allocate", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
      queryClient.invalidateQueries({ queryKey: ["seat-allocations"] });
    },
  });
}

export function useReleaseSeat(assignmentId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReleaseSeatInput) =>
      apiClient.post<{ status: string; message: string }>(
        `/api/v1/seat-allocations/${assignmentId}/release`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seats.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
      queryClient.invalidateQueries({ queryKey: ["seat-allocations"] });
    },
  });
}
