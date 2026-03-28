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
  { factor: null, label: "1x" },
  { factor: 2, label: "2x" },
  { factor: 3, label: "3x" },
];

type ToolbarProps = {
  hasImage: boolean;
  onReplaceImage: () => void;
  transform: ViewTransform;
  onTransformChange: (t: ViewTransform) => void;
  onResetView: () => void;
  onResetGuides: () => void;
  guideColor: string;
  onGuideColorChange: (hex: string) => void;
  /** null = equal width; 2 | 3 = this column is enlarged (only one side app-wide). */
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReplaceImage}
          className={
            hasImage
              ? "rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-1.5 font-mono text-xs text-zinc-200 transition hover:border-amber-600/50 hover:bg-zinc-800"
              : "rounded-lg border border-amber-600/50 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-medium text-amber-200/95 transition hover:border-amber-500/70 hover:bg-amber-500/15"
          }
        >
          {hasImage ? "Replace image" : "Upload image"}
        </button>
        <button
          type="button"
          disabled={!hasImage}
          onClick={onResetView}
          className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-2.5 py-1.5 font-mono text-xs text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-40"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={onResetGuides}
          className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-2.5 py-1.5 font-mono text-xs text-zinc-200 transition hover:bg-zinc-800"
        >
          Reset guides
        </button>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1 font-mono text-[10px] text-zinc-400">
          <span className="shrink-0">Guide</span>
          <input
            type="color"
            value={guideColor}
            onChange={(e) => onGuideColorChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-zinc-600 bg-zinc-800 p-0"
            title="Guide line color"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-2 py-1.5 font-mono text-[10px] text-zinc-400">
          <span className="mr-1 shrink-0 text-zinc-500">Viewer</span>
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
                className={`rounded-md border px-2 py-1 tabular-nums transition ${
                  active
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-100"
                    : "border-zinc-600 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 ${!hasImage ? "pointer-events-none opacity-40" : ""}`}
      >
        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center justify-between gap-2">
            Rotation
            <span className="tabular-nums text-zinc-300">
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
            className="h-1.5 w-full cursor-pointer accent-amber-500 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center justify-between gap-2">
            Zoom
            <span className="tabular-nums text-zinc-300">
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
            className="h-1.5 w-full cursor-pointer accent-amber-500 disabled:cursor-not-allowed"
          />
        </label>
      </div>
    </div>
  );
}
