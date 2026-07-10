import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AiQueryResponse {
  intent: string;
  parameters: Record<string, any>;
  data: any;
  summary: string;
  confidence: number;
}

export function useSuggestedPrompts() {
  return useQuery<string[]>({
    queryKey: ["ai", "suggested-prompts"],
    queryFn: () => apiClient.get<string[]>("/api/v1/ai/suggested-prompts"),
  });
}

export function useAiQuery() {
  return useMutation<AiQueryResponse, Error, { question: string }>({
    mutationFn: (data) =>
      apiClient.post<AiQueryResponse>("/api/v1/ai/query", data),
  });
}
