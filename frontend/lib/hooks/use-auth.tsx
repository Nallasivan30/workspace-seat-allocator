"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { loginSchema } from "@/lib/zod-schemas";
import { z } from "zod";

type LoginCredentials = z.infer<typeof loginSchema>;

interface User {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "viewer";
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Sync token from localStorage on mount
  React.useEffect(() => {
    const savedToken = localStorage.getItem("ethara_auth_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery<User>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      try {
        return await apiClient.get<User>("/api/v1/auth/me");
      } catch (err) {
        handleLogout();
        throw err;
      }
    },
    enabled: !!token,
    retry: false,
  } as any);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      return apiClient.post<{ access_token: string; token_type: string }>(
        "/api/v1/auth/login",
        credentials
      );
    },
    onSuccess: async (data) => {
      localStorage.setItem("ethara_auth_token", data.access_token);
      setToken(data.access_token);
      setErrorMsg(null);
      await refetch();
      router.push("/");
    },
    onError: (err: any) => {
      console.error("Login error details:", err);
      setErrorMsg(err.message || "Invalid email or password");
    },
  });

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem("ethara_auth_token");
    setToken(null);
    queryClient.setQueryData(queryKeys.auth.me(), null);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  const value = React.useMemo(
    () => ({
      user: user || null,
      token,
      isAuthenticated: !!user,
      isLoading: token ? isLoading : false,
      error: errorMsg,
      login: async (credentials: LoginCredentials) => {
        setErrorMsg(null);
        await loginMutation.mutateAsync(credentials);
      },
      logout: handleLogout,
    }),
    [user, token, isLoading, errorMsg, loginMutation, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
