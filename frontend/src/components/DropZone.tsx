import { useCallback, useState } from "react";
import { UploadCloud, X } from "lucide-react";
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
  };

  return (
    <div className="w-full">
      {!preview ? (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all",
            dragOver
              ? "border-brand-purple bg-purple-50 dark:bg-purple-900/10"
              : "border-gray-200 bg-gray-50 hover:border-brand-blue hover:bg-blue-50/40 dark:border-[#2a2a2a] dark:bg-[#252525] dark:hover:border-brand-blue dark:hover:bg-blue-900/10",
            disabled && "pointer-events-none opacity-50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <UploadCloud className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mb-1 text-base font-semibold text-gray-700 dark:text-gray-200">
            Drag & drop your photo here
          </p>
          <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">
            JPEG, PNG, WebP or TIFF · max {maxMb} MB
          </p>
          <Button variant="outline" size="sm" type="button" disabled={disabled}>
            Browse files
          </Button>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={onInput}
            disabled={disabled}
          />
        </label>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-[#2a2a2a] dark:bg-[#1c1c1c]">
          <img src={preview} alt="preview" className="max-h-72 w-full object-contain" />
          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-2 dark:border-[#2a2a2a] dark:bg-[#1c1c1c]">
            <span className="truncate text-sm text-gray-600 dark:text-gray-300">{fileName}</span>
            <button
              onClick={clear}
              className="ml-2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-[#252525]"
            >
              <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
