"use client";

import {
  ROTATION_SLIDER_STEP,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_SLIDER_STEP,
} from "@/lib/centering/constants";
import type { ViewerMagnifyFactor, ViewTransform } from "@/lib/centering/types";

function normalizeRotationDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

const VIEWER_MAGNIFY_BUTTONS: {
  factor: ViewerMagnifyFactor | null;
  label: string;
}[] = [
  { factor: null, label: "1×" },
  { factor: 2, label: "2×" },
  { factor: 3, label: "3×" },
];

const btnBase =
  "rounded-2xl border px-3 py-2 text-xs transition disabled:pointer-events-none disabled:opacity-40";

type ToolbarProps = {
  hasImage: boolean;
  onReplaceImage: () => void;
  transform: ViewTransform;
  onTransformChange: (t: ViewTransform) => void;
  onResetView: () => void;
  onResetGuides: () => void;
  guideColor: string;
  onGuideColorChange: (hex: string) => void;
  viewerMagnifyActive: ViewerMagnifyFactor | null;
  onViewerMagnify: (factor: ViewerMagnifyFactor | null) => void;
};

export function Toolbar({
  hasImage,
  onReplaceImage,
  transform,
  onTransformChange,
  onResetView,
  onResetGuides,
  guideColor,
  onGuideColorChange,
  viewerMagnifyActive,
  onViewerMagnify,
}: ToolbarProps) {
  const rotationShown = normalizeRotationDeg(transform.rotation);

  const setRotation = (rotation: number) => {
    onTransformChange({
      ...transform,
      rotation: normalizeRotationDeg(rotation),
    });
  };

  const setScale = (scale: number) => {
    const s = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
    onTransformChange({ ...transform, scale: s });
  };

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReplaceImage}
          className={`${btnBase} ${
            hasImage
              ? "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-900/80"
              : "border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/15"
          }`}
        >
          {hasImage ? "Replace image" : "Upload image"}
        </button>
        <button
          type="button"
          disabled={!hasImage}
          onClick={onResetView}
          className={`${btnBase} border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-300`}
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={onResetGuides}
          className={`${btnBase} border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-300`}
        >
          Reset guides
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-500">
          <span className="shrink-0">Guide</span>
          <input
            type="color"
            value={guideColor}
            onChange={(e) => onGuideColorChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-0.5"
            title="Guide line color"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-2 py-1.5">
          <span className="px-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Viewer
          </span>
          {VIEWER_MAGNIFY_BUTTONS.map(({ factor, label }) => {
            const active =
              factor === null
                ? viewerMagnifyActive === null
                : viewerMagnifyActive === factor;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onViewerMagnify(factor)}
                title={
                  factor === null
                    ? "Equal column width"
                    : `Widen this side (${factor}× vs other)`
                }
                className={`rounded-xl border px-2.5 py-1.5 text-xs tabular-nums transition ${
                  active
                    ? "border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 ${!hasImage ? "pointer-events-none opacity-45" : ""}`}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Rotation
              <span className="tabular-nums text-sm font-medium normal-case tracking-normal text-zinc-300">
                {rotationShown.toFixed(1)}°
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={359.9}
              step={ROTATION_SLIDER_STEP}
              value={Math.min(359.9, rotationShown)}
              disabled={!hasImage}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-emerald-500 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Zoom
              <span className="tabular-nums text-sm font-medium normal-case tracking-normal text-zinc-300">
                {transform.scale.toFixed(3)}×
              </span>
            </span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_SLIDER_STEP}
              value={Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, transform.scale))}
              disabled={!hasImage}
              onChange={(e) => setScale(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-emerald-500 disabled:cursor-not-allowed"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
