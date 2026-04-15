import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  clientToNaturalFromContain,
  naturalToOverlayPx,
  overlayPxToNatural,
} from "@/lib/centering/perspective";
import type { PerspectiveQuad, Point2 } from "@/lib/centering/types";

export type CornerId = "tl" | "tr" | "br" | "bl";

export const CORNER_ORDER: CornerId[] = ["tl", "tr", "br", "bl"];

export const CORNER_LABELS: Record<CornerId, string> = {
  tl: "Top-left",
  tr: "Top-right",
  br: "Bottom-right",
  bl: "Bottom-left",
};

const ZOOM_SCALE = 2.85;

type DragRef = {
  corner: CornerId;
  startCorner: { x: number; y: number };
  startNatural: { x: number; y: number };
};

export type LiveStateRef = {
  natural: { w: number; h: number } | null;
  displaySize: { w: number; h: number };
  viewportSize: { w: number; h: number };
  focusCorner: CornerId;
  quad: PerspectiveQuad | null;
  fullCardView: boolean;
};

function localImgRect(w: number, h: number): DOMRect {
  return new DOMRect(0, 0, w, h);
}

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

  const imgLocalRect = localImgRect(dw, dh);
  const c = live.quad[live.focusCorner];
  if (!c) return null;

  const { x: cx, y: cy } = zoomAnchor
    ? zoomAnchor
    : naturalToOverlayPx(c, imgLocalRect, nw, nh);

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

type UseCornerDragParams = {
  imgRef: React.RefObject<HTMLImageElement | null>;
  liveRef: React.RefObject<LiveStateRef>;
  setQuad: React.Dispatch<React.SetStateAction<PerspectiveQuad | null>>;
};

export function useCornerDrag({
  imgRef,
  liveRef,
  setQuad,
}: UseCornerDragParams) {
  const dragRef = useRef<DragRef | null>(null);
  const handleUpRef = useRef<() => void>(() => {});
  const [isDragging, setIsDragging] = useState(false);
  /** Overlay (px) center for zoom while dragging — keeps the view fixed until release. */
  const zoomPanFrozenRef = useRef<{ x: number; y: number } | null>(null);
  /** Same anchor for screen→natural mapping during zoom drag. */
  const zoomMapAnchorRef = useRef<{ x: number; y: number } | null>(null);

  const noopPointerUp = useCallback(() => {
    handleUpRef.current();
  }, []);

  const onWindowPointerMove = useCallback(
    (e: PointerEvent) => {
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
        if (
          prev &&
          Math.abs(prev.x - x) < 0.25 &&
          Math.abs(prev.y - y) < 0.25
        ) {
          return q;
        }
        return { ...q, [d.corner]: { x, y } };
      });
    },
    [imgRef, liveRef, setQuad],
  );

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
          const rect = localImgRect(dw, dh);
          const anchor = naturalToOverlayPx(q, rect, nw, nh);
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
    [imgRef, liveRef, noopPointerUp, onWindowPointerMove],
  );

  useEffect(() => {
    return () => {
      handleUpRef.current();
    };
  }, []);

  return { isDragging, startDrag, zoomPanFrozenRef };
}
