import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContourQuery } from "@/api/hooks";
import { PAPER_SIZES, type PaperSize } from "@/api/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function CalibrationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");

  const { data, isLoading, error, refetch } = useContourQuery(token ?? null, paperSize);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Badge variant="info" className="mb-4">Step 2 of 4</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900 dark:text-gray-50">
        Calibration Preview
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Select your calibration sheet size so we can compute the correct scale.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Calibration settings</CardTitle>
          <CardDescription>Token: {token}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Paper size selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paper-size" className="text-gray-700 dark:text-gray-300">
              Calibration sheet size
            </Label>
            <div className="flex gap-3">
              <select
                id="paper-size"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="flex h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-[#2a2a2a] dark:bg-[#252525] dark:text-gray-50"
              >
                {PAPER_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Button
                variant="gradient"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? "Processing…" : data ? "Re-process" : "Process"}
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 py-4 text-gray-500 dark:text-gray-400">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
              Extracting contour…
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <strong>Error:</strong> {(error as Error).message}
              <br />
              <span className="text-gray-500 dark:text-gray-400">
                Ensure the calibration sheet is clearly visible and the image is well-lit.
              </span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {[
                  { label: "Sheet size", value: data.paper_size },
                  { label: "Scale", value: `${data.scale.toFixed(2)} px/mm` },
                  { label: "Contour points", value: data.points.length },
                  { label: "Image size", value: `${data.image_width} × ${data.image_height} px` },
                  { label: "Spline points", value: data.spline_points ? data.spline_points.length : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-[#252525]">
                    <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
                    <div className="font-semibold text-gray-800 dark:text-gray-100">{value}</div>
                  </div>
                ))}
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/edit/${token}`, { state: { paperSize } })}
              >
                Continue to Curve Editor →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
