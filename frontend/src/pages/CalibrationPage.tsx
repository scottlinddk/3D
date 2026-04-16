import { useParams, useNavigate } from "react-router-dom";
import { useContourQuery } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CalibrationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useContourQuery(token ?? null);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Badge variant="info" className="mb-4">Step 2 of 4</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900">Calibration Preview</h1>
      <p className="mb-8 text-gray-500">
        We're detecting the A4 calibration sheet and extracting the object contour.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Processing results</CardTitle>
          <CardDescription>Token: {token}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-3 py-8 text-gray-500">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
              Extracting contour…
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              <strong>Error:</strong> {(error as Error).message}
              <br />
              <span className="text-gray-500">
                Ensure the A4 sheet is clearly visible and the image is well-lit.
              </span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Scale</div>
                  <div className="font-semibold text-gray-800">{data.scale.toFixed(2)} px/mm</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Contour points</div>
                  <div className="font-semibold text-gray-800">{data.points.length}</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Image size</div>
                  <div className="font-semibold text-gray-800">
                    {data.image_width} × {data.image_height} px
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-400">Spline points</div>
                  <div className="font-semibold text-gray-800">
                    {data.spline_points ? data.spline_points.length : "—"}
                  </div>
                </div>
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={() => navigate(`/edit/${token}`)}
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
