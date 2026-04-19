import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./fetcher";
import type { ModelRequest, HistorySaveRequest } from "./schemas";

export function useUploadMutation() {
  return useMutation({
    mutationFn: (file: File) => api.upload(file),
  });
}

export function useContourQuery(token: string | null, paperSize = "A4") {
  return useQuery({
    queryKey: ["contour", token, paperSize],
    queryFn: () => api.contour(token!, paperSize),
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

// ── History ──────────────────────────────────────────────────────────────────

export function useHistoryQuery() {
  return useQuery({
    queryKey: ["history"],
    queryFn: () => api.listHistory(),
    staleTime: 30_000,
  });
}

export function useSaveHistoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: HistorySaveRequest) => api.saveHistory(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });
}

export function useDeleteHistoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteHistory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });
}
