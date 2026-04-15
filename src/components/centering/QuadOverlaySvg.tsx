import { GripVertical } from "lucide-react";
import type { CornerId } from "@/hooks/useCornerDrag";
import { CORNER_LABELS, CORNER_ORDER } from "@/hooks/useCornerDrag";
import { naturalToOverlayPx } from "@/lib/centering/perspective";
import type { PerspectiveQuad } from "@/lib/centering/types";

const HANDLE_OFFSET_PX = 52;

const HANDLE_OUTWARD: Record<CornerId, { x: number; y: number }> = {
  tl: { x: -1, y: -1 },
  tr: { x: 1, y: -1 },
  br: { x: 1, y: 1 },
  bl: { x: -1, y: 1 },
};

function handleOverlayPosition(
  cornerId: CornerId,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const u = HANDLE_OUTWARD[cornerId];
  const n = Math.hypot(u.x, u.y);
  const k = HANDLE_OFFSET_PX / n;
  return { x: cx + u.x * k, y: cy + u.y * k };
}

type QuadEdgesProps = {
  quad: PerspectiveQuad;
  localRect: DOMRect;
  nw: number;
  nh: number;
  dw: number;
  dh: number;
  strokeOpacity?: string;
  strokeWidth?: number;
};

function QuadEdges({
  quad,
  localRect,
  nw,
  nh,
  dw,
  dh,
  strokeOpacity = "rgba(212,175,55,0.75)",
  strokeWidth = 2,
}: QuadEdgesProps) {
  return (
    <svg
      className="absolute left-0 top-0 overflow-visible"
      width={dw}
      height={dh}
      aria-hidden
      role="presentation"
    >
      {CORNER_ORDER.map((id, i) => {
        const next = CORNER_ORDER[(i + 1) % 4];
        const pa = quad[id];
        const pb = next ? quad[next] : undefined;
        if (!next || !pa || !pb) return null;
        const a = naturalToOverlayPx(pa, localRect, nw, nh);
        const b = naturalToOverlayPx(pb, localRect, nw, nh);
        return (
          <line
            key={`${id}-${next}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={strokeOpacity}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </svg>
  );
}

type CornerCrosshairProps = {
  cx: number;
  cy: number;
  isFocus: boolean;
  arm?: number;
};

function CornerCrosshair({ cx, cy, isFocus, arm = 10 }: CornerCrosshairProps) {
  return (
    <svg
      className="pointer-events-none absolute overflow-visible"
      width={0}
      height={0}
      aria-hidden
      role="presentation"
    >
      <g stroke="rgba(250,204,21,0.95)" strokeWidth={isFocus ? 2 : 1.25}>
        <line x1={cx - arm} y1={cy} x2={cx + arm} y2={cy} />
        <line x1={cx} y1={cy - arm} x2={cx} y2={cy + arm} />
      </g>
    </svg>
  );
}

type GripHandleProps = {
  cornerId: CornerId;
  cx: number;
  cy: number;
  isFocus: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
};

function GripHandle({
  cornerId,
  cx,
  cy,
  isFocus,
  onPointerDown,
}: GripHandleProps) {
  const { x: hx, y: hy } = handleOverlayPosition(cornerId, cx, cy);
  return (
    <button
      type="button"
      aria-label={`Drag ${CORNER_LABELS[cornerId]} corner`}
      className={`pointer-events-auto absolute flex h-12 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded-xl border bg-zinc-950/95 shadow-lg active:cursor-grabbing ${
        isFocus
          ? "border-amber-400/90 ring-2 ring-amber-500/30"
          : "border-zinc-600/90"
      }`}
      style={{ left: hx, top: hy }}
      onPointerDown={onPointerDown}
    >
      <GripVertical
        className="h-5 w-5 text-amber-200/90"
        aria-hidden
        strokeWidth={2}
      />
    </button>
  );
}

type QuadOverlaySvgProps = {
  quad: PerspectiveQuad;
  localRect: DOMRect;
  nw: number;
  nh: number;
  dw: number;
  dh: number;
  focusCorner: CornerId;
  startDrag: (corner: CornerId) => (e: React.PointerEvent) => void;
  mode: "full" | "zoom";
};

/**
 * Renders quad edges, crosshairs, and grip handles over a card image.
 * Used in both full-card and corner-zoom modes.
 */
export function QuadOverlaySvg({
  quad,
  localRect,
  nw,
  nh,
  dw,
  dh,
  focusCorner,
  startDrag,
  mode,
}: QuadOverlaySvgProps) {
  if (mode === "full") {
    return (
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: dw, height: dh }}
      >
        <QuadEdges
          quad={quad}
          localRect={localRect}
          nw={nw}
          nh={nh}
          dw={dw}
          dh={dh}
        />
        {CORNER_ORDER.map((id) => {
          const pt = quad[id];
          if (!pt) return null;
          const { x: cx, y: cy } = naturalToOverlayPx(pt, localRect, nw, nh);
          const isFocus = id === focusCorner;
          return (
            <div key={id}>
              <CornerCrosshair cx={cx} cy={cy} isFocus={isFocus} />
              <GripHandle
                cornerId={id}
                cx={cx}
                cy={cy}
                isFocus={isFocus}
                onPointerDown={startDrag(id)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: dw, height: dh }}
    >
      <QuadEdges
        quad={quad}
        localRect={localRect}
        nw={nw}
        nh={nh}
        dw={dw}
        dh={dh}
        strokeOpacity="rgba(212,175,55,0.55)"
        strokeWidth={1.5}
      />
      <svg
        className="absolute left-0 top-0 overflow-visible"
        width={dw}
        height={dh}
        aria-hidden
        role="presentation"
      >
        {CORNER_ORDER.map((id) => {
          const pt = quad[id];
          if (!pt) return null;
          const { x: cx, y: cy } = naturalToOverlayPx(pt, localRect, nw, nh);
          const isFocus = id === focusCorner;
          return (
            <g
              key={`x-${id}`}
              stroke={
                isFocus ? "rgba(250,204,21,0.95)" : "rgba(250,204,21,0.45)"
              }
              strokeWidth={isFocus ? 2 : 1}
            >
              <line x1={cx - 12} y1={cy} x2={cx + 12} y2={cy} />
              <line x1={cx} y1={cy - 12} x2={cx} y2={cy + 12} />
            </g>
          );
        })}
      </svg>
      {(() => {
        const pt = quad[focusCorner];
        if (!pt) return null;
        const { x: cx, y: cy } = naturalToOverlayPx(pt, localRect, nw, nh);
        return (
          <GripHandle
            cornerId={focusCorner}
            cx={cx}
            cy={cy}
            isFocus
            onPointerDown={startDrag(focusCorner)}
          />
        );
      })()}
    </div>
  );
}
