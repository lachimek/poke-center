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

const VERTICAL: { key: GuideKey; label: string }[] = [
  { key: "left1", label: "L1" },
  { key: "left2", label: "L2" },
  { key: "right1", label: "R1" },
  { key: "right2", label: "R2" },
];

const HORIZONTAL: { key: GuideKey; label: string }[] = [
  { key: "top1", label: "T1" },
  { key: "top2", label: "T2" },
  { key: "bottom1", label: "B1" },
  { key: "bottom2", label: "B2" },
];

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

  const bindVertical = (key: GuideKey) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        key,
        startClient: e.clientX,
        startGuides: { ...guides },
      };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      if (!dragRef.current) return;
      applyDrag(e.clientX);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  });

  const bindHorizontal = (key: GuideKey) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        key,
        startClient: e.clientY,
        startGuides: { ...guides },
      };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      if (!dragRef.current) return;
      applyDrag(e.clientY);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  });

  const lineGlow = `0 0 12px ${ACCENT_DIM}`;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {VERTICAL.map(({ key: guideKey, label }) => {
        const px = guides[guideKey] * displayScale;
        const h = bindVertical(guideKey);
        return (
          <div
            key={guideKey}
            className="pointer-events-auto absolute top-0 bottom-0 cursor-ew-resize touch-none"
            style={{
              left: px - LINE_HIT_PX / 2,
              width: LINE_HIT_PX,
            }}
            {...h}
          >
            <div
              className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full"
              style={{
                backgroundColor: ACCENT,
                boxShadow: `${lineGlow}, 0 0 0 1px ${ACCENT_DIM}`,
              }}
            />
            <span
              className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm"
              style={{ color: ACCENT }}
            >
              {label}
            </span>
          </div>
        );
      })}

      {HORIZONTAL.map(({ key: guideKey, label }) => {
        const px = guides[guideKey] * displayScale;
        const h = bindHorizontal(guideKey);
        return (
          <div
            key={guideKey}
            className="pointer-events-auto absolute left-0 right-0 cursor-ns-resize touch-none"
            style={{
              top: px - LINE_HIT_PX / 2,
              height: LINE_HIT_PX,
            }}
            {...h}
          >
            <div
              className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
              style={{
                backgroundColor: ACCENT,
                boxShadow: `${lineGlow}, 0 0 0 1px ${ACCENT_DIM}`,
              }}
            />
            <span
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm"
              style={{ color: ACCENT }}
            >
              {label}
            </span>
          </div>
        );
      })}

      <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg border border-zinc-800/80 bg-black/50 px-2 py-1 text-[10px] text-zinc-500">
        {CARD_LOGICAL_WIDTH}×{CARD_LOGICAL_HEIGHT}
      </div>
    </div>
  );
}
