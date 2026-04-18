import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Download, RotateCcw } from "lucide-react";
import { useCreateModelMutation } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function ExportPage() {
  const { token } = useParams<{ token: string }>();
  const { state } = useLocation() as { state?: { points?: [number, number][] } };
  const navigate = useNavigate();

  const [height, setHeight] = useState(10);
  const [format, setFormat] = useState<"stl" | "step">("stl");
  const [revolve, setRevolve] = useState(false);

  const { mutateAsync, isPending, data, error, reset } = useCreateModelMutation();

  // Ensure the download URL is always same-origin (path only). If the backend
  // returns an absolute URL with an internal hostname (e.g. http://backend:8000/...)
  // the browser can't resolve it and the download attribute is ignored for
  // cross-origin links. Extracting just the pathname fixes both problems.
  const downloadUrl = data?.url
    ? (() => { try { return new URL(data.url).pathname; } catch { return data.url; } })()
    : undefined;

  const points = state?.points ?? [];

  const generate = async () => {
    if (!token) return;
    await mutateAsync({ token, points, height, format, revolve });
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Badge variant="info" className="mb-4">Step 4 of 4</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900 dark:text-gray-50">
        Export 3-D Model
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Configure the solid parameters and generate your CAD file.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Model parameters</CardTitle>
          <CardDescription>
            {points.length} profile points · token {token?.slice(0, 8)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="height" className="text-gray-700 dark:text-gray-300">
                Extrusion height (mm)
              </Label>
              <Input
                id="height"
                type="number"
                min={0.1}
                step={0.5}
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 10)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="format" className="text-gray-700 dark:text-gray-300">
                Output format
              </Label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as "stl" | "step")}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-[#2a2a2a] dark:bg-[#252525] dark:text-gray-50"
              >
                <option value="stl">STL — mesh (FDM printing)</option>
                <option value="step">STEP — solid (parametric CAD)</option>
              </select>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-[#2a2a2a] dark:bg-[#252525]">
            <input
              type="checkbox"
              checked={revolve}
              onChange={(e) => setRevolve(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-purple"
            />
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Revolve profile
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Rotate 360° around Y-axis (lathe / pottery shape)
              </div>
            </div>
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {(error as Error).message}
            </div>
          )}

          {data ? (
            <div className="flex flex-col gap-3 rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/10">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Model generated successfully!
              </p>
              <a href={downloadUrl} download={data.filename}>
                <Button variant="gradient" className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Download {data.filename}
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-500 dark:text-gray-400"
                onClick={() => {
                  reset();
                  navigate("/");
                }}
              >
                <RotateCcw className="h-3 w-3" /> Start over
              </Button>
            </div>
          ) : (
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={isPending || points.length < 3}
              onClick={generate}
            >
              {isPending ? "Generating…" : "Generate 3-D Model"}
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
