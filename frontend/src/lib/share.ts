export interface ShareData {
  points: [number, number][];
  height: number;
  revolve: boolean;
  format: "stl" | "step";
  paper_size: string;
}

function toUrlSafeBase64(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromUrlSafeBase64(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return atob(pad ? padded + "=".repeat(4 - pad) : padded);
}

export function buildShareUrl(data: ShareData): string {
  const encoded = toUrlSafeBase64(JSON.stringify(data));
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/share?d=${encoded}`;
}

export function decodeShareParam(param: string): ShareData | null {
  try {
    return JSON.parse(fromUrlSafeBase64(param)) as ShareData;
  } catch {
    return null;
  }
}
