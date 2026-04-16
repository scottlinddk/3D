// Hand-written types matching the backend's OpenAPI schema.
// After the backend is running, regenerate via: npm run generate-api

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
