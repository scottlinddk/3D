import { lazy, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FileBox, Home } from "lucide-react";
import { decodeShareParam } from "@/lib/share";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ProfileViewer = lazy(() =>
  import("@/components/ProfileViewer").then((m) => ({ default: m.ProfileViewer })),
);

const ViewerFallback = (
  <div className="flex h-[440px] items-center justify-center rounded-xl bg-[#0d0d0d]">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
  </div>
);

export function SharePage() {
  const [params] = useSearchParams();
  const raw = params.get("d");
  const data = raw ? decodeShareParam(raw) : null;

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
          Invalid or missing share link.
        </p>
        <Link to="/">
          <Button variant="gradient" className="gap-2">
            <Home className="h-4 w-4" /> Back to app
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Badge variant="info" className="mb-4">Shared model</Badge>
      <h1 className="mb-2 text-4xl font-extrabold text-gray-900 dark:text-gray-50">
        Shared 3D Model
      </h1>
      <p className="mb-8 text-gray-500 dark:text-gray-400">
        {data.points.length} profile points · height {data.height} mm ·{" "}
        {data.revolve ? "revolve" : "extrude"} · {data.format.toUpperCase()} · {data.paper_size}
      </p>

      {data.format === "stl" ? (
        <Suspense fallback={ViewerFallback}>
          <ProfileViewer
            points={data.points}
            initialHeight={data.height}
            initialRevolve={data.revolve}
            filename="shared-model"
          />
        </Suspense>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl bg-[#0d0d0d]">
          <FileBox className="h-10 w-10 text-gray-600" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-300">STEP model</p>
            <p className="mt-1 text-xs text-gray-600">
              Open in FreeCAD, Fusion 360, or similar CAD software.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Link to="/">
          <Button variant="ghost" className="gap-2 text-gray-500">
            <Home className="h-4 w-4" /> Create your own
          </Button>
        </Link>
      </div>
    </main>
  );
}
