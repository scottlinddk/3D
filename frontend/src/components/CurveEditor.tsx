import { useState, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import type { ContourResponse } from "@/api/schemas";

interface CurveEditorProps {
  contour: ContourResponse;
  onChange: (points: [number, number][]) => void;
}

type Point = [number, number];

const SVG_W = 600;
const SVG_H = 400;
const PAD = 40;

function normalize(points: Point[], w: number, h: number): Point[] {
  if (points.length === 0) return [];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((w - 2 * PAD) / rangeX, (h - 2 * PAD) / rangeY);
  return points.map(([x, y]) => [
    PAD + (x - minX) * scale,
    h - PAD - (y - minY) * scale,
  ]);
}

function toSvgPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
}

export function CurveEditor({ contour, onChange }: CurveEditorProps) {
  const [points, setPoints] = useState<Point[]>(contour.points as Point[]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showSpline, setShowSpline] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);

  const display = normalize(points, SVG_W, SVG_H);
  const splineDisplay = contour.spline_points
    ? normalize(contour.spline_points as Point[], SVG_W, SVG_H)
    : null;

  const svgToData = useCallback(
    (svgX: number, svgY: number): Point => {
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;
      const scale = Math.min((SVG_W - 2 * PAD) / rangeX, (SVG_H - 2 * PAD) / rangeY);
      return [(svgX - PAD) / scale + minX, (SVG_H - PAD - svgY) / scale + minY];
    },
    [points],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragging.current === null) return;
      const rect = svgRef.current!.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * SVG_W;
      const sy = ((e.clientY - rect.top) / rect.height) * SVG_H;
      const newPt = svgToData(sx, sy);
      setPoints((prev) => {
        const next = [...prev];
        next[dragging.current!] = newPt;
        onChange(next);
        return next;
      });
    },
    [onChange, svgToData],
  );

  const removePoint = (i: number) => {
    const next = points.filter((_, idx) => idx !== i);
    setPoints(next);
    onChange(next);
    setSelected(null);
  };

  const addPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const sy = ((e.clientY - rect.top) / rect.height) * SVG_H;
    const newPt = svgToData(sx, sy);
    const next = [...points, newPt] as Point[];
    setPoints(next);
    onChange(next);
  };

  const reset = () => {
    const orig = contour.points as Point[];
    setPoints(orig);
    onChange(orig);
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">{points.length} points</span>
        <Button variant="outline" size="sm" onClick={reset}>Reset</Button>
        {splineDisplay && (
          <Button
            variant={showSpline ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSpline((v) => !v)}
          >
            {showSpline ? "Hide Spline" : "Show Spline"}
          </Button>
        )}
        {selected !== null && (
          <Button variant="destructive" size="sm" onClick={() => removePoint(selected)}>
            Remove point {selected}
          </Button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          Click SVG to add · drag handle to move
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full rounded-xl border border-gray-100 bg-white/60 shadow-card cursor-crosshair"
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
        onClick={addPoint}
      >
        {/* Spline overlay */}
        {showSpline && splineDisplay && (
          <path
            d={toSvgPath(splineDisplay)}
            fill="none"
            stroke="#a78bfa"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        )}

        {/* Polyline */}
        <path d={toSvgPath(display)} fill="rgba(99,102,241,0.08)" stroke="#6366f1" strokeWidth={2} />

        {/* Handles */}
        {display.map((pt, i) => (
          <circle
            key={i}
            cx={pt[0]}
            cy={pt[1]}
            r={selected === i ? 7 : 5}
            fill={selected === i ? "#f472b6" : "#6366f1"}
            stroke="white"
            strokeWidth={2}
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(i === selected ? null : i);
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragging.current = i;
              setSelected(i);
            }}
          />
        ))}
      </svg>

      <p className="text-xs text-gray-400">
        Scale: {contour.scale.toFixed(2)} px/mm · image {contour.image_width}×
        {contour.image_height}
      </p>
    </div>
  );
}
