// Hand-written types matching the backend's OpenAPI schema.

export const PAPER_SIZES = ["A3", "A4", "A5", "A6", "Letter", "Legal", "Tabloid"] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

export interface UploadResponse {
  token: string;
}

export interface StatusResponse {
  token: string;
  status: "pending" | "processing" | "ready" | "error";
  message?: string | null;
}

export interface ContourResponse {
  token: string;
  /** Simplified profile as [[x_mm, y_mm], ...] */
  points: [number, number][];
  /** Pixels per mm from calibration sheet */
  scale: number;
  image_width: number;
  image_height: number;
  spline_points?: [number, number][] | null;
  paper_size: PaperSize;
}

export interface ModelRequest {
  token: string;
  points: [number, number][];
  height?: number;
  format?: "stl" | "step";
  revolve?: boolean;
}

export interface ModelResponse {
  url: string;
  format: string;
  filename: string;
}

// ── History ──────────────────────────────────────────────────────────────────

export interface HistorySaveRequest {
  name?: string;
  points: [number, number][];
  height: number;
  revolve: boolean;
  format: "stl" | "step";
  paper_size: PaperSize;
}

export interface HistoryEntry {
  id: number;
  name: string;
  points: [number, number][];
  height: number;
  revolve: boolean;
  format: string;
  paper_size: string;
  created_at: string;
}
