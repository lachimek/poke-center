"use client";

import { useCallback, useRef } from "react";
import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
} from "@/lib/centering/constants";
import { clampGuides, guideStrokeColors } from "@/lib/centering/math";
import type { GuideKey, GuideLines } from "@/lib/centering/types";

type GuideOverlayProps = {
  displayScale: number;
  guides: GuideLines;
  onGuidesChange: (next: GuideLines) => void;
  guideColor: string;
};

const LINE_HIT_PX = 12;

type GuideAxis = "x" | "y";

type GuideLineConfig = {
  key: GuideKey;
  label: string;
  axis: GuideAxis;
};

const GUIDE_LINES: GuideLineConfig[] = [
  { key: "left", label: "L", axis: "x" },
  { key: "right", label: "R", axis: "x" },
  { key: "top", label: "T", axis: "y" },
  { key: "bottom", label: "B", axis: "y" },
];

type GuideLineHandleProps = {
  guideKey: GuideKey;
  label: string;
  axis: GuideAxis;
  positionPx: number;
  accent: string;
  accentDim: string;
  bindAxis: (key: GuideKey, axis: GuideAxis) => {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
};

function GuideLineHandle({
  guideKey,
  label,
  axis,
  positionPx,
  accent,
  accentDim,
  bindAxis,
}: GuideLineHandleProps) {
  const isVertical = axis === "x";
  const handlers = bindAxis(guideKey, axis);
  const lineGlow = `0 0 12px ${accentDim}`;

  return (
    <div
      key={guideKey}
      className={`pointer-events-auto absolute touch-none ${
        isVertical
          ? "top-0 bottom-0 cursor-ew-resize"
          : "left-0 right-0 cursor-ns-resize"
      }`}
      style={
        isVertical
          ? { left: positionPx - LINE_HIT_PX / 2, width: LINE_HIT_PX }
          : { top: positionPx - LINE_HIT_PX / 2, height: LINE_HIT_PX }
      }
      {...handlers}
    >
      <div
        className={`absolute rounded-full ${
          isVertical
            ? "top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2"
            : "left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
        }`}
        style={{
          backgroundColor: accent,
          boxShadow: `${lineGlow}, 0 0 0 1px ${accentDim}`,
        }}
      />
      <span
        className={`pointer-events-none absolute rounded-lg border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${
          isVertical
            ? "left-1/2 top-2 -translate-x-1/2"
            : "left-2 top-1/2 -translate-y-1/2"
        }`}
        style={{ color: accent }}
      >
        {label}
      </span>
    </div>
  );
}

export function GuideOverlay({
  displayScale,
  guides,
  onGuidesChange,
  guideColor,
}: GuideOverlayProps) {
  const { main: ACCENT, dim: ACCENT_DIM } = guideStrokeColors(guideColor);

  const dragRef = useRef<{
    key: GuideKey;
    startClient: number;
    startGuides: GuideLines;
  } | null>(null);

  const applyDrag = useCallback(
    (clientPos: number) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = (clientPos - d.startClient) / displayScale;
      const next = { ...d.startGuides };
      next[d.key] = d.startGuides[d.key] + delta;
      onGuidesChange(clampGuides(next));
    },
    [displayScale, onGuidesChange],
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
    dragRef.current = null;
  }, []);

  const bindAxis = useCallback(
    (key: GuideKey, axis: GuideAxis) => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
          key,
          startClient: axis === "x" ? e.clientX : e.clientY,
          startGuides: { ...guides },
        };
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        if (!dragRef.current) return;
        applyDrag(axis === "x" ? e.clientX : e.clientY);
      },
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    }),
    [guides, applyDrag, endDrag],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {GUIDE_LINES.map(({ key, label, axis }) => (
        <GuideLineHandle
          key={key}
          guideKey={key}
          label={label}
          axis={axis}
          positionPx={guides[key] * displayScale}
          accent={ACCENT}
          accentDim={ACCENT_DIM}
          bindAxis={bindAxis}
        />
      ))}

      <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg border border-zinc-800/80 bg-black/50 px-2 py-1 text-[10px] text-zinc-500">
        {CARD_LOGICAL_WIDTH}×{CARD_LOGICAL_HEIGHT}
      </div>
    </div>
  );
}
