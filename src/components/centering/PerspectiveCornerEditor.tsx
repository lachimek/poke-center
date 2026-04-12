"use client";

import { ChevronRight, GripVertical, LayoutGrid } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  clientToNaturalFromContain,
  defaultPerspectiveQuad,
  isPerspectiveQuadValid,
  naturalToOverlayPx,
  overlayPxToNatural,
} from "@/lib/centering/perspective";
import type { PerspectiveQuad, Point2 } from "@/lib/centering/types";

type CornerId = "tl" | "tr" | "br" | "bl";

const LABELS: Record<CornerId, string> = {
  tl: "Top-left",
  tr: "Top-right",
  br: "Bottom-right",
  bl: "Bottom-left",
};

const ORDER: CornerId[] = ["tl", "tr", "br", "bl"];

/** Outward diagonal from corner in overlay space (before normalize). */
const HANDLE_OUTWARD: Record<CornerId, { x: number; y: number }> = {
  tl: { x: -1, y: -1 },
  tr: { x: 1, y: -1 },
  br: { x: 1, y: 1 },
  bl: { x: -1, y: 1 },
};

const ZOOM_SCALE = 2.85;
const HANDLE_OFFSET_PX = 52;

type PerspectiveCornerEditorProps = {
  rawImageSrc: string;
  savedQuad: PerspectiveQuad | null;
  onDraftChange: (
    quad: PerspectiveQuad,
    valid: boolean,
    hint: string | null,
  ) => void;
};

function localImgRect(w: number, h: number): DOMRect {
  return new DOMRect(0, 0, w, h);
}

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

type DragRef = {
  corner: CornerId;
  startCorner: { x: number; y: number };
  startNatural: { x: number; y: number };
};

/** Latest interaction state — avoids unstable callbacks that depend on `quad`. */
type LiveStateRef = {
  natural: { w: number; h: number } | null;
  displaySize: { w: number; h: number };
  viewportSize: { w: number; h: number };
  focusCorner: CornerId;
  quad: PerspectiveQuad | null;
  fullCardView: boolean;
};

function pointerClientToNatural(
  clientX: number,
  clientY: number,
  img: HTMLImageElement,
  live: LiveStateRef,
  zoomAnchor: { x: number; y: number } | null,
): Point2 | null {
  const nat = live.natural;
  if (!nat || live.displaySize.w < 1 || live.displaySize.h < 1) return null;

  const dw = live.displaySize.w;
  const dh = live.displaySize.h;
  const nw = nat.w;
  const nh = nat.h;

  if (live.fullCardView) {
    const rect = img.getBoundingClientRect();
    const p = clientToNaturalFromContain(clientX, clientY, rect, nw, nh);
    return {
      x: Math.max(0, Math.min(nw, p.x)),
      y: Math.max(0, Math.min(nh, p.y)),
    };
  }

  const vpEl = img.closest("[data-pc-zoom-viewport]") as HTMLElement | null;
  if (!vpEl) return null;
  const vp = vpEl.getBoundingClientRect();
  const vw = vpEl.clientWidth;
  const vh = vpEl.clientHeight;
  if (vw < 1 || vh < 1 || !live.quad) return null;

  const localRect = localImgRect(dw, dh);
  const c = live.quad[live.focusCorner];
  if (!c) return null;

  const { x: cx, y: cy } = zoomAnchor
    ? zoomAnchor
    : naturalToOverlayPx(c, localRect, nw, nh);

  const Z = ZOOM_SCALE;
  const px = clientX - vp.left;
  const py = clientY - vp.top;
  const ix = (px - vw / 2) / Z + cx;
  const iy = (py - vh / 2) / Z + cy;
  const p = overlayPxToNatural(ix, iy, dw, dh, nw, nh);
  return {
    x: Math.max(0, Math.min(nw, p.x)),
    y: Math.max(0, Math.min(nh, p.y)),
  };
}

export function PerspectiveCornerEditor({
  rawImageSrc,
  savedQuad,
  onDraftChange,
}: PerspectiveCornerEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [quad, setQuad] = useState<PerspectiveQuad | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [focusCorner, setFocusCorner] = useState<CornerId>("tl");
  /** Full card first avoids an empty corner-zoom viewport before layout (fixes stuck “Loading”). */
  const [fullCardView, setFullCardView] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragRef | null>(null);
  const handleUpRef = useRef<() => void>(() => {});
  const lastRawSrcRef = useRef<string | null>(null);
  /** Overlay (px) center for zoom while dragging — keeps the view fixed until release. */
  const zoomPanFrozenRef = useRef<{ x: number; y: number } | null>(null);
  /** Same anchor for screen→natural mapping during zoom drag. */
  const zoomMapAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const liveRef = useRef<LiveStateRef>({
    natural: null,
    displaySize: { w: 0, h: 0 },
    viewportSize: { w: 0, h: 0 },
    focusCorner: "tl",
    quad: null,
    fullCardView: true,
  });
  const draftRafRef = useRef<number | null>(null);

  const noopPointerUp = useCallback(() => {
    handleUpRef.current();
  }, []);

  useEffect(() => {
    if (rawImageSrc !== lastRawSrcRef.current) {
      lastRawSrcRef.current = rawImageSrc;
      setNatural(null);
      setQuad(null);
    }
  }, [rawImageSrc]);

  const bootstrapFromImage = useCallback(() => {
    const el = imgRef.current;
    if (!el?.naturalWidth) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNatural({ w, h });
    setQuad((prev) => {
      if (prev) return prev;
      return savedQuad ?? defaultPerspectiveQuad(w, h);
    });
  }, [savedQuad]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: also when rawImageSrc changes (new blob)
  useLayoutEffect(() => {
    bootstrapFromImage();
  }, [bootstrapFromImage, rawImageSrc]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new <img> when toggling zoom/full or replacing blob
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDisplaySize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    setDisplaySize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, [fullCardView, rawImageSrc]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: viewport only in corner-zoom mode; measure before paint
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () =>
      setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullCardView]);

  liveRef.current = {
    natural,
    displaySize,
    viewportSize,
    focusCorner,
    quad,
    fullCardView,
  };

  useEffect(() => {
    if (!quad || !natural) return;
    if (draftRafRef.current !== null) cancelAnimationFrame(draftRafRef.current);
    draftRafRef.current = requestAnimationFrame(() => {
      draftRafRef.current = null;
      const r = isPerspectiveQuadValid(quad, natural.w, natural.h);
      onDraftChange(quad, r.ok, r.ok ? null : r.hint);
    });
    return () => {
      if (draftRafRef.current !== null) {
        cancelAnimationFrame(draftRafRef.current);
        draftRafRef.current = null;
      }
    };
  }, [quad, natural, onDraftChange]);

  const cycleFocusCorner = useCallback(() => {
    setFocusCorner((prev) => {
      const i = ORDER.indexOf(prev);
      return ORDER[(i + 1) % 4] ?? "tl";
    });
  }, []);

  const onWindowPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    const img = imgRef.current;
    if (!d || !img) return;
    const p = pointerClientToNatural(
      e.clientX,
      e.clientY,
      img,
      liveRef.current,
      zoomMapAnchorRef.current,
    );
    if (!p) return;
    const nx = d.startCorner.x + (p.x - d.startNatural.x);
    const ny = d.startCorner.y + (p.y - d.startNatural.y);
    const nat = liveRef.current.natural;
    if (!nat) return;
    const x = Math.max(0, Math.min(nat.w, nx));
    const y = Math.max(0, Math.min(nat.h, ny));
    setQuad((q) => {
      if (!q) return q;
      const prev = q[d.corner];
      if (prev && Math.abs(prev.x - x) < 0.25 && Math.abs(prev.y - y) < 0.25) {
        return q;
      }
      return { ...q, [d.corner]: { x, y } };
    });
  }, []);

  useLayoutEffect(() => {
    handleUpRef.current = () => {
      dragRef.current = null;
      zoomPanFrozenRef.current = null;
      zoomMapAnchorRef.current = null;
      setIsDragging(false);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", noopPointerUp);
      window.removeEventListener("pointercancel", noopPointerUp);
    };
  }, [noopPointerUp, onWindowPointerMove]);

  const startDrag = useCallback(
    (corner: CornerId) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const p = pointerClientToNatural(
        e.clientX,
        e.clientY,
        img,
        liveRef.current,
        null,
      );
      const q = liveRef.current.quad?.[corner];
      if (!p || !q) return;

      if (!liveRef.current.fullCardView && liveRef.current.quad) {
        const { w: nw, h: nh } = liveRef.current.natural ?? { w: 0, h: 0 };
        const { w: dw, h: dh } = liveRef.current.displaySize;
        if (nw > 0 && nh > 0 && dw > 0 && dh > 0) {
          const localRect = localImgRect(dw, dh);
          const anchor = naturalToOverlayPx(q, localRect, nw, nh);
          zoomPanFrozenRef.current = anchor;
          zoomMapAnchorRef.current = anchor;
        }
      }

      dragRef.current = {
        corner,
        startCorner: { ...q },
        startNatural: p,
      };
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      window.addEventListener("pointermove", onWindowPointerMove);
      window.addEventListener("pointerup", noopPointerUp);
      window.addEventListener("pointercancel", noopPointerUp);
    },
    [noopPointerUp, onWindowPointerMove],
  );

  useEffect(() => {
    return () => {
      handleUpRef.current();
    };
  }, []);

  const nw = natural?.w ?? 0;
  const nh = natural?.h ?? 0;
  const dw = displaySize.w;
  const dh = displaySize.h;
  const localRect = dw > 0 && dh > 0 ? localImgRect(dw, dh) : null;

  const vw = Math.max(viewportSize.w, viewportRef.current?.clientWidth ?? 0);
  const vh = Math.max(viewportSize.h, viewportRef.current?.clientHeight ?? 0);

  const focusPt = quad?.[focusCorner];
  const focusOverlayLive =
    quad && localRect && focusPt
      ? naturalToOverlayPx(focusPt, localRect, nw, nh)
      : null;

  const zoomCenter = zoomPanFrozenRef.current ?? focusOverlayLive ?? null;

  const zoomTransform =
    zoomCenter && vw > 0 && vh > 0
      ? `translate(${vw / 2}px, ${vh / 2}px) scale(${ZOOM_SCALE}) translate(${-zoomCenter.x}px, ${-zoomCenter.y}px)`
      : undefined;

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-xs text-zinc-500">
        Adjust corners on the full card first. When you need more precision,
        switch to <span className="text-zinc-400">Corner zoom</span> — use the
        grip outside each vertex so the crosshair stays visible, and{" "}
        <span className="text-zinc-400">Next corner</span> to cycle focus.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={cycleFocusCorner}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-500/15"
        >
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          Next corner
        </button>
        <span className="text-xs text-zinc-400">
          Focus:{" "}
          <span className="font-medium text-zinc-200">
            {LABELS[focusCorner]}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setFullCardView((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-900"
        >
          <LayoutGrid className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          {fullCardView ? "Corner zoom" : "Full card"}
        </button>
      </div>

      {fullCardView ? (
        <div className="relative mx-auto w-full max-w-full">
          {/* biome-ignore lint/performance/noImgElement: blob object URL; same as CardViewer */}
          <img
            ref={imgRef}
            src={rawImageSrc}
            alt="Uploaded card — place perspective corners on the edges"
            draggable={false}
            onLoad={bootstrapFromImage}
            className="block max-h-[min(70vh,720px)] w-full max-w-full object-contain select-none"
          />
          {quad && localRect && nw > 0 && nh > 0 ? (
            <div
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: dw, height: dh }}
            >
              <svg
                className="absolute left-0 top-0 overflow-visible"
                width={dw}
                height={dh}
                aria-hidden
                role="presentation"
              >
                {ORDER.map((id, i) => {
                  const next = ORDER[(i + 1) % 4];
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
                      stroke="rgba(212,175,55,0.75)"
                      strokeWidth={2}
                    />
                  );
                })}
              </svg>
              {ORDER.map((id) => {
                const pt = quad[id];
                if (!pt) return null;
                const { x: cx, y: cy } = naturalToOverlayPx(
                  pt,
                  localRect,
                  nw,
                  nh,
                );
                const { x: hx, y: hy } = handleOverlayPosition(id, cx, cy);
                const isFocus = id === focusCorner;
                return (
                  <div key={id}>
                    <svg
                      className="pointer-events-none absolute overflow-visible"
                      width={dw}
                      height={dh}
                      aria-hidden
                      role="presentation"
                    >
                      <g
                        stroke="rgba(250,204,21,0.95)"
                        strokeWidth={isFocus ? 2 : 1.25}
                      >
                        <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} />
                        <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} />
                      </g>
                    </svg>
                    <button
                      type="button"
                      aria-label={`Drag ${LABELS[id]} corner`}
                      className={`pointer-events-auto absolute flex h-12 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none flex-col items-center justify-center gap-0.5 rounded-xl border bg-zinc-950/95 shadow-lg active:cursor-grabbing ${
                        isFocus
                          ? "border-amber-400/90 ring-2 ring-amber-500/30"
                          : "border-zinc-600/90"
                      }`}
                      style={{ left: hx, top: hy }}
                      onPointerDown={startDrag(id)}
                    >
                      <GripVertical
                        className="h-5 w-5 text-amber-200/90"
                        aria-hidden
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          ref={viewportRef}
          data-pc-zoom-viewport
          className="relative mx-auto w-full max-w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80"
          style={{
            height: "min(52vh, 440px)",
            touchAction: isDragging ? "none" : undefined,
          }}
        >
          {quad && localRect && zoomTransform ? (
            <div
              className="absolute left-0 top-0 origin-top-left will-change-transform"
              style={{
                width: dw,
                height: dh,
                transform: zoomTransform,
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: blob object URL; same as CardViewer */}
              <img
                ref={imgRef}
                src={rawImageSrc}
                alt="Corner zoom — align the crosshair on the card vertex"
                draggable={false}
                onLoad={bootstrapFromImage}
                className="pointer-events-none block h-full w-full object-contain select-none"
              />
              <div
                className="pointer-events-none absolute left-0 top-0"
                style={{ width: dw, height: dh }}
              >
                <svg
                  className="absolute left-0 top-0 overflow-visible"
                  width={dw}
                  height={dh}
                  aria-hidden
                  role="presentation"
                >
                  {ORDER.map((id, i) => {
                    const next = ORDER[(i + 1) % 4];
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
                        stroke="rgba(212,175,55,0.55)"
                        strokeWidth={1.5}
                      />
                    );
                  })}
                  {ORDER.map((id) => {
                    const pt = quad[id];
                    if (!pt) return null;
                    const { x: cx, y: cy } = naturalToOverlayPx(
                      pt,
                      localRect,
                      nw,
                      nh,
                    );
                    const isFocus = id === focusCorner;
                    return (
                      <g
                        key={`x-${id}`}
                        stroke={
                          isFocus
                            ? "rgba(250,204,21,0.95)"
                            : "rgba(250,204,21,0.45)"
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
                  const { x: cx, y: cy } = naturalToOverlayPx(
                    pt,
                    localRect,
                    nw,
                    nh,
                  );
                  const { x: hx, y: hy } = handleOverlayPosition(
                    focusCorner,
                    cx,
                    cy,
                  );
                  return (
                    <button
                      type="button"
                      aria-label={`Drag ${LABELS[focusCorner]} corner`}
                      className="pointer-events-auto absolute flex h-12 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none flex-col items-center justify-center rounded-xl border border-amber-400/90 bg-zinc-950/95 shadow-lg ring-2 ring-amber-500/25 active:cursor-grabbing"
                      style={{ left: hx, top: hy }}
                      onPointerDown={startDrag(focusCorner)}
                    >
                      <GripVertical
                        className="h-5 w-5 text-amber-200/90"
                        aria-hidden
                        strokeWidth={2}
                      />
                    </button>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">
              Loading image…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
