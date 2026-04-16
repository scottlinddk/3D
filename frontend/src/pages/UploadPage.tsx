import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUploadMutation } from "@/api/hooks";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { mutateAsync, isPending, error } = useUploadMutation();

  const submit = async () => {
    if (!file) return;
    const res = await mutateAsync(file);
    navigate(`/calibrate/${res.token}`);
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center">
      <Badge variant="info" className="mb-4">Step 1 of 4</Badge>
      <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-gray-900">
        Photo to&nbsp;
        <span className="bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue bg-clip-text text-transparent">
          3-D Model.
        </span>
      </h1>
      <p className="mb-10 text-lg text-gray-500">
        Place your object on a white A4 sheet, photograph it from above, then upload.
      </p>

      <Card className="w-full text-left">
        <CardHeader>
          <CardTitle>Upload photo</CardTitle>
          <CardDescription>
            JPEG, PNG, WebP or TIFF · max 20 MB · object on A4 calibration sheet
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DropZone onFile={setFile} disabled={isPending} />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {(error as Error).message}
            </p>
          )}

          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={!file || isPending}
            onClick={submit}
          >
            {isPending ? "Uploading…" : "Upload & Continue"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-16 grid grid-cols-3 gap-6 text-left">
        {[
          { title: "Calibration", body: "Place the object on a standard A4 sheet so we can compute real-world scale." },
          { title: "Contour extraction", body: "OpenCV detects the object outline and simplifies it to key waypoints." },
          { title: "3-D export", body: "CadQuery extrudes the profile into a STEP or STL file ready for CAD software." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-white/60 bg-white/60 p-5 backdrop-blur-sm">
            <h3 className="mb-1 font-semibold text-gray-800">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
