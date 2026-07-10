export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  employees: {
    all: () => ["employees"] as const,
    list: (filters: Record<string, any>) => ["employees", "list", filters] as const,
    detail: (id: string | number) => ["employees", "detail", id] as const,
    unassigned: () => ["employees", "unassigned"] as const,
  },
  projects: {
    all: () => ["projects"] as const,
    list: (filters: Record<string, any>) => ["projects", "list", filters] as const,
    detail: (id: string | number) => ["projects", "detail", id] as const,
    staffed: (id: string | number) => ["projects", "staffed", id] as const,
  },
  buildings: {
    all: () => ["buildings"] as const,
    floors: (buildingId: string | number) => ["buildings", buildingId, "floors"] as const,
  },
  floors: {
    seats: (floorId: string | number) => ["floors", floorId, "seats"] as const,
  },
  seats: {
    all: () => ["seats"] as const,
    list: (filters: Record<string, any>) => ["seats", "list", filters] as const,
    detail: (id: string | number) => ["seats", "detail", id] as const,
    available: (filters: Record<string, any>) => ["seats", "available", filters] as const,
  },
  allocations: {
    all: () => ["allocations"] as const,
    list: (filters: Record<string, any>) => ["allocations", "list", filters] as const,
  },
  dashboard: {
    summary: () => ["dashboard", "summary"] as const,
    utilization: () => ["dashboard", "utilization"] as const,
  },
  analytics: {
    projects: (filters: Record<string, any>) => ["analytics", "projects", filters] as const,
    departments: () => ["analytics", "departments"] as const,
    seatTurnover: (filters: Record<string, any>) => ["analytics", "seatTurnover", filters] as const,
  },
  search: {
    global: (query: string, types: string[]) => ["search", "global", query, types] as const,
  },
  ai: {
    prompts: () => ["ai", "prompts"] as const,
  },
};
