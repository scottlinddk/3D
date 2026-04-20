import { lazy, Suspense, useState } from "react";
import { Trash2, RotateCcw, Clock } from "lucide-react";
import { useHistoryQuery, useDeleteHistoryMutation } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { HistoryEntry } from "@/api/schemas";

const ProfileViewer = lazy(() =>
  import("@/components/ProfileViewer").then((m) => ({ default: m.ProfileViewer })),
);

const ViewerFallback = (
  <div className="flex h-[440px] items-center justify-center rounded-xl bg-[#0d0d0d]">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
  </div>
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: del, isPending: isDeleting } = useDeleteHistoryMutation();

  const handleDelete = () => {
    del(entry.id, { onSuccess: onDelete });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{entry.format.toUpperCase()} model</CardTitle>
              <Badge variant="info" className="text-xs">
                {entry.paper_size}
              </Badge>
              <Badge className="text-xs border border-gray-200 bg-transparent text-gray-500 dark:border-[#2a2a2a] dark:text-gray-400">
                {entry.revolve ? "Revolve" : "Extrude"}
              </Badge>
            </div>
            <CardDescription className="mt-1 flex items-center gap-1.5 text-xs">
              <Clock className="h-3 w-3" />
              {formatDate(entry.created_at)}
              <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
              {entry.points.length} points
              <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
              height {entry.height} mm
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            {entry.format === "stl" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setExpanded((e) => !e)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {expanded ? "Hide" : "Load"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && entry.format === "stl" && (
        <CardContent className="pt-0">
          <Suspense fallback={ViewerFallback}>
            <ProfileViewer
              points={entry.points}
              initialHeight={entry.height}
              initialRevolve={entry.revolve}
              filename={`model-${entry.id}`}
            />
          </Suspense>
        </CardContent>
      )}
    </Card>
  );
}

export function HistoryPage() {
  const { data, isLoading, error } = useHistoryQuery();
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const visible = data?.filter((e) => !deletedIds.has(e.id)) ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Badge variant="info" className="mb-4">History</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900 dark:text-gray-50">
        Saved Models
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        Previously generated models — load any STL into the interactive viewer or delete it.
      </p>

      {isLoading && (
        <div className="flex items-center gap-3 py-12 text-gray-500">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          Loading history…
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <strong>Error:</strong> {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && visible.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-12 text-center dark:border-[#2a2a2a]">
          <p className="text-sm text-gray-400">No saved models yet.</p>
          <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
            Generate a model and click "Save to History" on the export page.
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex flex-col gap-4">
          {visible.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              onDelete={() => setDeletedIds((s) => new Set(s).add(entry.id))}
            />
          ))}
        </div>
      )}
    </main>
  );
}
