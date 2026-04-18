import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContourQuery } from "@/api/hooks";
import { CurveEditor } from "@/components/CurveEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContourResponse } from "@/api/schemas";

export function EditorPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useContourQuery(token ?? null);
  const [editedPoints, setEditedPoints] = useState<[number, number][] | null>(null);

  const contour = data as ContourResponse | undefined;
  const points = editedPoints ?? contour?.points ?? [];

  const proceed = () => {
    navigate(`/export/${token}`, { state: { points, token } });
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Badge variant="info" className="mb-4">Step 3 of 4</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900 dark:text-gray-50">
        Curve Editor
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Drag handles to adjust the profile. Click the canvas to add new points.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            {points.length} waypoints · token {token?.slice(0, 8)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-3 py-8 text-gray-500 dark:text-gray-400">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
              Loading contour…
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {(error as Error).message}
            </div>
          )}

          {contour && (
            <CurveEditor contour={contour} onChange={(pts) => setEditedPoints(pts)} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button
          variant="gradient"
          size="lg"
          disabled={points.length < 3}
          onClick={proceed}
        >
          Proceed to Export →
        </Button>
      </div>
    </main>
  );
}
