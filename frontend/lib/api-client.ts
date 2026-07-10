const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, string>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || "An API error occurred");
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code || "UNKNOWN_ERROR";
    this.details = payload.details || {};
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  // Get token from localStorage
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("ethara_auth_token");
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { error: { code: "PARSING_ERROR", message: "Failed to parse response JSON", details: {} } };
  }

  if (!response.ok) {
    const errorPayload = data.error || {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
      details: {},
    };
    throw new ApiError(response.status, errorPayload);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { method: "DELETE", ...options }),
};
