const STORAGE_KEY = "curveextract_api_base";

/** Returns the effective API base URL: build-time env → localStorage → "" (same origin). */
export function getApiBase(): string {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE as string;
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiBase(url: string): void {
  const trimmed = url.trim().replace(/\/$/, "");
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearApiBase(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns true when a backend URL is known (build-time or runtime). */
export function hasApiBase(): boolean {
  return getApiBase() !== "";
}

/** Pings the backend health endpoint. Resolves true/false. */
export async function pingBackend(url: string): Promise<boolean> {
  try {
    const base = url.trim().replace(/\/$/, "");
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}
