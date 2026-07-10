import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SearchResult {
  employees: Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    department: string;
    designation: string;
    status: string;
  }>;
  projects: Array<{
    id: number;
    project_name: string;
    project_code: string;
    client_name: string;
    status: string;
  }>;
  seats: Array<{
    id: number;
    seat_code: string;
    status: string;
    seat_type: string;
    floor_number?: number;
    building_name?: string;
  }>;
}

export function useSearch(query: string, types?: string[], limit = 10) {
  const queryParams = new URLSearchParams();
  queryParams.set("q", query);
  if (types && types.length > 0) {
    queryParams.set("types", types.join(","));
  }
  queryParams.set("limit", String(limit));

  return useQuery<SearchResult>({
    queryKey: queryKeys.search.global(query, types || []),
    queryFn: () => apiClient.get<SearchResult>(`/api/v1/search?${queryParams.toString()}`),
    enabled: query.trim().length >= 2,
    keepPreviousData: true,
  } as any);
}
