import { Box } from "lucide-react";

export function GeneratingAnimation() {
  return (
    <div className="flex h-80 flex-col items-center justify-center gap-8 rounded-xl bg-[#0d0d0d]">
      {/* Layered spinning rings around a box icon */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        {/* Outer ring — slow */}
        <span
          className="absolute inset-0 animate-spin rounded-full border border-violet-500/20 border-t-violet-500"
          style={{ animationDuration: "3s" }}
        />
        {/* Middle ring — medium, reversed */}
        <span
          className="absolute inset-3 animate-spin rounded-full border border-blue-500/20 border-t-blue-400"
          style={{ animationDuration: "2s", animationDirection: "reverse" }}
        />
        {/* Inner ring — fast */}
        <span
          className="absolute inset-6 animate-spin rounded-full border border-violet-400/30 border-t-violet-300"
          style={{ animationDuration: "1.2s" }}
        />
        {/* Centre icon */}
        <Box className="h-6 w-6 animate-pulse text-violet-400" />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-semibold text-gray-200">Building your 3-D model</p>
        <p className="text-xs text-gray-500">Extruding profile with CadQuery — this takes a few seconds…</p>
      </div>

      {/* Pulsing progress bar */}
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full w-1/2 animate-bounce rounded-full bg-gradient-to-r from-violet-600 to-blue-500"
          style={{ animation: "pulse-bar 1.6s ease-in-out infinite" }}
        />
      </div>

      <style>{`
        @keyframes pulse-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
