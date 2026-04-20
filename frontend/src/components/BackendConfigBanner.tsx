import { useState, useEffect } from "react";
import { ServerCrash, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiBase, setApiBase, clearApiBase, hasApiBase, pingBackend } from "@/lib/apiBase";

export function BackendConfigBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  useEffect(() => {
    // Only show on GitHub Pages (no build-time backend configured)
    if (!import.meta.env.VITE_API_BASE) {
      setVisible(true);
      setExpanded(!hasApiBase());
      setUrl(getApiBase());
    }
  }, []);

  if (!visible) return null;

  const configured = hasApiBase();

  const handleTest = async () => {
    setStatus("testing");
    const ok = await pingBackend(url);
    setStatus(ok ? "ok" : "fail");
    if (ok) {
      setApiBase(url);
      setExpanded(false);
      window.location.reload();
    }
  };

  const handleClear = () => {
    clearApiBase();
    setUrl("");
    setStatus("idle");
    setExpanded(true);
    window.location.reload();
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30">
      <div className="mx-auto max-w-6xl px-6 py-2">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-center gap-2 text-left"
        >
          <ServerCrash className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            {configured
              ? <>Backend configured: <code className="font-mono text-xs">{getApiBase()}</code></>
              : "No backend configured — upload and 3D generation require a running backend."}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-amber-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-amber-500" />
          )}
        </button>

        {expanded && (
          <div className="mt-3 pb-3">
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
              Enter the URL of your running backend (e.g.{" "}
              <code className="font-mono">https://your-api.example.com</code>).
              The backend must have CORS enabled.
            </p>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setStatus("idle"); }}
                placeholder="https://your-backend.example.com"
                className="h-8 flex-1 font-mono text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
              />
              <Button
                size="sm"
                variant="gradient"
                className="h-8 gap-1.5"
                disabled={!url.trim() || status === "testing"}
                onClick={handleTest}
              >
                {status === "testing" && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {status === "ok" && <Check className="h-3.5 w-3.5" />}
                {status === "fail" && <X className="h-3.5 w-3.5" />}
                {status === "idle" || status === "testing" ? "Connect" : status === "ok" ? "Connected!" : "Retry"}
              </Button>
              {configured && (
                <Button size="sm" variant="ghost" className="h-8 text-amber-700 dark:text-amber-400" onClick={handleClear}>
                  Clear
                </Button>
              )}
            </div>
            {status === "fail" && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                Could not reach <code className="font-mono">{url}/health</code>. Check the URL and that CORS is enabled.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
