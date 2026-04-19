import { useState, lazy, Suspense } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Download, RotateCcw, FileBox } from "lucide-react";
import { useCreateModelMutation } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GeneratingAnimation } from "@/components/GeneratingAnimation";

const ModelViewer = lazy(() =>
  import("@/components/ModelViewer").then((m) => ({ default: m.ModelViewer })),
);

function toPathname(url: string) {
  try { return new URL(url).pathname; } catch { return url; }
}

export function ExportPage() {
  const { token } = useParams<{ token: string }>();
  const { state } = useLocation() as { state?: { points?: [number, number][] } };
  const navigate = useNavigate();

  const [height, setHeight] = useState(10);
  const [format, setFormat] = useState<"stl" | "step">("stl");
  const [revolve, setRevolve] = useState(false);

  const { mutateAsync, isPending, data, error, reset } = useCreateModelMutation();

  const points = state?.points ?? [];
  const downloadUrl = data ? toPathname(data.url) : undefined;

  const generate = async () => {
    if (!token) return;
    await mutateAsync({ token, points, height, format, revolve });
  };

  const startOver = () => { reset(); navigate("/"); };

  // Expand the page when the 3-D viewer is visible
  const wide = isPending || !!data;

  return (
    <main className={`mx-auto px-6 py-16 transition-all duration-300 ${wide ? "max-w-4xl" : "max-w-2xl"}`}>
      <Badge variant="info" className="mb-4">Step 4 of 4</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900 dark:text-gray-50">
        Export 3-D Model
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Configure the solid parameters and generate your CAD file.
      </p>

      <div className="flex flex-col gap-6">
        {/* ── Parameters card — hidden while generating or when result is ready ── */}
        {!isPending && !data && (
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

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={isPending || points.length < 3}
                onClick={generate}
              >
                Generate 3-D Model
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Generating animation ── */}
        {isPending && <GeneratingAnimation />}

        {/* ── Result ── */}
        {data && downloadUrl && (
          <div className="flex flex-col gap-4">
            {/* 3-D viewer (STL) or STEP placeholder */}
            {data.format === "stl" ? (
              <Suspense fallback={
                <div className="flex h-[440px] items-center justify-center rounded-xl bg-[#0d0d0d]">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              }>
                <ModelViewer url={downloadUrl} />
              </Suspense>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl bg-[#0d0d0d]">
                <FileBox className="h-10 w-10 text-gray-600" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-300">STEP file ready</p>
                  <p className="mt-1 text-xs text-gray-600">
                    STEP cannot be previewed in the browser — open in FreeCAD, Fusion 360, or similar.
                  </p>
                </div>
              </div>
            )}

            {/* Success banner + actions */}
            <div className="rounded-xl border border-green-900/30 bg-green-900/10 p-4">
              <p className="mb-3 text-sm font-medium text-green-400">
                Model generated successfully!
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={downloadUrl} download={data.filename} className="flex-1">
                  <Button variant="gradient" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Download {data.filename}
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  className="gap-1.5 text-gray-500 dark:text-gray-400"
                  onClick={startOver}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Start over
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
