const BASE = import.meta.env.VITE_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  let bodyInit: BodyInit | undefined;

  if (body instanceof FormData) {
    bodyInit = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: bodyInit });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, detail?.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<import("./schemas").UploadResponse>("POST", "/api/upload", fd);
  },

  contour: (token: string, paperSize = "A4") =>
    request<import("./schemas").ContourResponse>(
      "GET",
      `/api/contour/${token}?paper_size=${encodeURIComponent(paperSize)}`,
    ),

  status: (token: string) =>
    request<import("./schemas").StatusResponse>("GET", `/api/status/${token}`),

  createModel: (body: import("./schemas").ModelRequest) =>
    request<import("./schemas").ModelResponse>("POST", "/api/model", body),

  // History
  saveHistory: (body: import("./schemas").HistorySaveRequest) =>
    request<import("./schemas").HistoryEntry>("POST", "/api/history", body),

  listHistory: () =>
    request<import("./schemas").HistoryEntry[]>("GET", "/api/history"),

  deleteHistory: (id: number) =>
    request<void>("DELETE", `/api/history/${id}`),
};
