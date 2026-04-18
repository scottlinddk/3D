import { useCallback, useRef, useState } from "react";
import { Camera, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface DropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  maxMb?: number;
  disabled?: boolean;
}

export function DropZone({ onFile, accept = "image/*", maxMb = 20, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!file.type.startsWith("image/")) return "Only image files are accepted.";
    if (file.size > maxMb * 1024 * 1024) return `File exceeds ${maxMb} MB.`;
    return null;
  };

  const handle = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFile(file);
    },
    [onFile, maxMb],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handle(file);
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handle(file);
  };

  const clear = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all",
            dragOver
              ? "border-brand-purple bg-purple-50"
              : "border-gray-200 bg-white/60 hover:border-brand-blue hover:bg-blue-50/40",
            disabled && "pointer-events-none opacity-50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="mb-4 h-12 w-12 text-gray-300" />
          <p className="mb-1 text-base font-semibold text-gray-700">
            Drag & drop your photo here
          </p>
          <p className="mb-4 text-sm text-gray-400">
            JPEG, PNG, WebP or TIFF · max {maxMb} MB
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Browse files
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
            >
              <Camera className="mr-1 h-4 w-4" />
              Take photo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={onInput}
            disabled={disabled}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onInput}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80">
          <img src={preview} alt="preview" className="max-h-72 w-full object-contain" />
          <div className="flex items-center justify-between border-t border-gray-100 bg-white/80 px-4 py-2">
            <span className="truncate text-sm text-gray-600">{fileName}</span>
            <button onClick={clear} className="ml-2 rounded-full p-1 hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
