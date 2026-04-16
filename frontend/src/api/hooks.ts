import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./fetcher";
import type { ModelRequest } from "./schemas";

export function useUploadMutation() {
  return useMutation({
    mutationFn: (file: File) => api.upload(file),
  });
}

export function useContourQuery(token: string | null) {
  return useQuery({
    queryKey: ["contour", token],
    queryFn: () => api.contour(token!),
    enabled: token !== null,
    staleTime: Infinity,
    retry: false,
  });
}

export function useStatusQuery(token: string | null, enabled = true) {
  return useQuery({
    queryKey: ["status", token],
    queryFn: () => api.status(token!),
    enabled: token !== null && enabled,
    refetchInterval: 2000,
  });
}

export function useCreateModelMutation() {
  return useMutation({
    mutationFn: (body: ModelRequest) => api.createModel(body),
  });
}
