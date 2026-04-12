import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ViewTransform } from "@/lib/centering/types";

const MIN_FRAME_WIDTH = 32;
const RESIZE_RATIO_THRESHOLD = 0.004;

function fitScale(
  frameW: number,
  frameH: number,
  natW: number,
  natH: number,
): number {
  if (natW <= 0 || natH <= 0 || frameW <= 0 || frameH <= 0) return 1;
  return Math.min(frameW / natW, frameH / natH);
}

function measureContainer(el: HTMLElement): { w: number; h: number } {
  const r = el.getBoundingClientRect();
  return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
}

type UseCardViewerTransformParams = {
  imageSrc: string | null;
  transform: ViewTransform;
  onTransformChange: (t: ViewTransform) => void;
  fitRequestId: number;
  viewerScale: number;
};

export function useCardViewerTransform({
  imageSrc,
  transform,
  onTransformChange,
  fitRequestId,
  viewerScale,
}: UseCardViewerTransformParams) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [framePx, setFramePx] = useState({ w: 1, h: 1 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const panRef = useRef<{
    startX: number;
    startY: number;
    startTransform: ViewTransform;
  } | null>(null);

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const prevFrameWRef = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: effect must re-run when viewerScale changes
  useLayoutEffect(() => {
    prevFrameWRef.current = null;
  }, [viewerScale]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setFramePx(measureContainer(el));
    });
    ro.observe(el);
    setFramePx(measureContainer(el));
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const w = framePx.w;
    const prev = prevFrameWRef.current;

    if (!imageSrc || w < MIN_FRAME_WIDTH) {
      if (w >= MIN_FRAME_WIDTH) prevFrameWRef.current = w;
      return;
    }

    if (prev === null || prev < MIN_FRAME_WIDTH) {
      prevFrameWRef.current = w;
      return;
    }

    const ratio = w / prev;
    if (Math.abs(ratio - 1) > RESIZE_RATIO_THRESHOLD) {
      const t = transformRef.current;
      onTransformChange({
        ...t,
        scale: t.scale * ratio,
        offsetX: t.offsetX * ratio,
        offsetY: t.offsetY * ratio,
      });
    }

    prevFrameWRef.current = w;
  }, [framePx.w, imageSrc, onTransformChange]);

  const fitToContainer = useCallback(
    (natW?: number, natH?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const nw = natW ?? natural?.w;
      const nh = natH ?? natural?.h;
      if (!nw || !nh) return;
      const { w: fw, h: fh } = measureContainer(el);
      const s = fitScale(fw, fh, nw, nh);
      onTransformChange({ scale: s, offsetX: 0, offsetY: 0 });
    },
    [natural, onTransformChange],
  );

  useEffect(() => {
    if (fitRequestId === 0 || !natural) return;
    fitToContainer();
  }, [fitRequestId, natural, fitToContainer]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const doFit = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w <= 0 || h <= 0) return;
        setNatural({ w, h });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fitToContainer(w, h);
          });
        });
      };
      void img.decode().then(doFit).catch(doFit);
    },
    [fitToContainer],
  );

  const panStart = useCallback(
    (e: React.PointerEvent) => {
      if (!imageSrc || !natural || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTransform: { ...transform },
      };
    },
    [imageSrc, natural, transform],
  );

  const panMove = useCallback(
    (e: React.PointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const p = panRef.current;
      if (!p) return;
      onTransformChange({
        ...p.startTransform,
        offsetX: p.startTransform.offsetX + (e.clientX - p.startX),
        offsetY: p.startTransform.offsetY + (e.clientY - p.startY),
      });
    },
    [onTransformChange],
  );

  const panEnd = useCallback((e: React.PointerEvent) => {
    if (panRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    panRef.current = null;
  }, []);

  return {
    containerRef,
    framePx,
    natural,
    onImageLoad,
    panHandlers: {
      onPointerDown: panStart,
      onPointerMove: panMove,
      onPointerUp: panEnd,
      onPointerCancel: panEnd,
    },
  };
}
