"use client";

import type { ViewerMagnifyFactor } from "@/lib/centering/types";

const VIEWER_MAGNIFY_BUTTONS: {
  factor: ViewerMagnifyFactor | null;
  label: string;
}[] = [
  { factor: null, label: "1×" },
  { factor: 3, label: "3×" },
];

const btnBase =
  "rounded-2xl border px-3 py-2 text-xs transition disabled:pointer-events-none disabled:opacity-40";

type ToolbarProps = {
  hasImage: boolean;
  onReplaceImage: () => void;
  onResetView: () => void;
  onResetGuides: () => void;
  guideColor: string;
  onGuideColorChange: (hex: string) => void;
  viewerMagnifyActive: ViewerMagnifyFactor | null;
  onViewerMagnify: (factor: ViewerMagnifyFactor | null) => void;
  perspectiveMode: boolean;
  onOpenPerspective: () => void;
};

export function Toolbar({
  hasImage,
  onReplaceImage,
  onResetView,
  onResetGuides,
  guideColor,
  onGuideColorChange,
  viewerMagnifyActive,
  onViewerMagnify,
  perspectiveMode,
  onOpenPerspective,
}: ToolbarProps) {
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
          disabled={!hasImage || perspectiveMode}
          onClick={onOpenPerspective}
          className={`${btnBase} border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:bg-zinc-900/80`}
        >
          Perspective
        </button>
        <button
          type="button"
          disabled={!hasImage || perspectiveMode}
          onClick={onResetView}
          className={`${btnBase} border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-300`}
        >
          Reset view
        </button>
        <button
          type="button"
          disabled={perspectiveMode}
          onClick={onResetGuides}
          className={`${btnBase} border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-300`}
        >
          Reset guides
        </button>
        <label
          className={`flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-500 ${perspectiveMode ? "pointer-events-none opacity-45" : "cursor-pointer"}`}
        >
          <span className="shrink-0">Guide</span>
          <input
            type="color"
            value={guideColor}
            disabled={perspectiveMode}
            onChange={(e) => onGuideColorChange(e.target.value)}
            className="h-7 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-0.5 disabled:cursor-not-allowed"
            title="Guide line color"
          />
        </label>
        <div
          className={`flex flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-2 py-1.5 ${perspectiveMode ? "pointer-events-none opacity-45" : ""}`}
        >
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
                    ? "Show both sides"
                    : `Enlarge this viewer (${factor}×) and hide the other side`
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
    </div>
  );
}
