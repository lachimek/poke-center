"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
  WHEEL_ZOOM_STEP,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/lib/centering/constants";
import type { GuideLines, ViewTransform } from "@/lib/centering/types";
import { GuideOverlay } from "./GuideOverlay";

type CardViewerProps = {
  imageSrc: string | null;
  transform: ViewTransform;
  onTransformChange: (t: ViewTransform) => void;
  guides: GuideLines;
  onGuidesChange: (next: GuideLines) => void;
  guideColor: string;
  /** Increment from parent to re-run “fit to frame” (reset view). */
  fitRequestId: number;
  onUpload: (file: File) => void;
};

function fitScale(
  frameW: number,
  frameH: number,
  natW: number,
  natH: number,
): number {
  if (natW <= 0 || natH <= 0 || frameW <= 0 || frameH <= 0) return 1;
  return Math.min(frameW / natW, frameH / natH) * 0.92;
}

export function CardViewer({
  imageSrc,
  transform,
  onTransformChange,
  guides,
  onGuidesChange,
  guideColor,
  fitRequestId,
  onUpload,
}: CardViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const emptyFileRef = useRef<HTMLInputElement>(null);
  const [framePx, setFramePx] = useState({ w: 1, h: 1 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const panRef = useRef<{
    startX: number;
    startY: number;
    startTransform: ViewTransform;
  } | null>(null);

  const transformRef = useRef(transform);
  transformRef.current = transform;

  /** Previous viewer width (px); used to scale pan/zoom when the frame resizes (e.g. column magnify). */
  const prevFrameWRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setFramePx({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setFramePx({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    return () => ro.disconnect();
  }, []);

  /** Keep image aligned with guides when frame width changes: same ratio as logical displayScale. */
  useLayoutEffect(() => {
    const w = framePx.w;
    const prev = prevFrameWRef.current;

    if (!imageSrc || w < 32) {
      if (w >= 32) prevFrameWRef.current = w;
      return;
    }

    if (prev === null || prev < 32) {
      prevFrameWRef.current = w;
      return;
    }

    const ratio = w / prev;
    if (Math.abs(ratio - 1) > 0.004) {
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

  const displayScale = framePx.w / CARD_LOGICAL_WIDTH;

  const applyFit = useCallback(() => {
    const el = containerRef.current;
    if (!el || !natural) return;
    const r = el.getBoundingClientRect();
    const fw = Math.max(1, r.width);
    const fh = Math.max(1, r.height);
    const s = fitScale(fw, fh, natural.w, natural.h);
    onTransformChange({
      scale: s,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    });
  }, [natural, onTransformChange]);

  useEffect(() => {
    if (fitRequestId === 0 || !natural) return;
    applyFit();
  }, [fitRequestId, natural, applyFit]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const fw = Math.max(1, r.width);
      const fh = Math.max(1, r.height);
      const s = fitScale(fw, fh, w, h);
      onTransformChange({
        scale: s,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
      });
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    const factor = dir > 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
    const next = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, transform.scale * factor),
    );
    onTransformChange({ ...transform, scale: next });
  };

  const panStart = (e: React.PointerEvent) => {
    if (!imageSrc || !natural || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTransform: { ...transform },
    };
  };

  const panMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const p = panRef.current;
    if (!p) return;
    onTransformChange({
      ...p.startTransform,
      offsetX: p.startTransform.offsetX + (e.clientX - p.startX),
      offsetY: p.startTransform.offsetY + (e.clientY - p.startY),
    });
  };

  const panEnd = (e: React.PointerEvent) => {
    if (panRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
    panRef.current = null;
  };

  const { scale, rotation, offsetX, offsetY } = transform;
  const nw = natural?.w ?? 0;
  const nh = natural?.h ?? 0;
  const dispW = nw * scale;
  const dispH = nh * scale;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-950 shadow-inner"
      style={{ aspectRatio: `${CARD_LOGICAL_WIDTH} / ${CARD_LOGICAL_HEIGHT}` }}
      onWheel={onWheel}
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,#0a0a0c_0%,#050506_100%)]"
        aria-hidden
      />

      {!imageSrc && (
        <div className="absolute inset-0 z-[15] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <input
            ref={emptyFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <p className="font-mono text-xs tracking-wide text-zinc-500">
            No image loaded
          </p>
          <p className="max-w-[260px] text-xs leading-relaxed text-zinc-600">
            Upload a straight photo. Align the outer card to the frame, then
            place two guides per edge (L1/L2, R1/R2, T1/T2, B1/B2) — margins use
            the mean of each pair, not one inner box.
          </p>
          <button
            type="button"
            onClick={() => emptyFileRef.current?.click()}
            className="rounded-xl border border-amber-600/50 bg-amber-500/10 px-5 py-2.5 font-mono text-sm font-medium text-amber-200/95 transition hover:border-amber-500/70 hover:bg-amber-500/15"
          >
            Upload image
          </button>
        </div>
      )}

      {imageSrc && (
        <div
          className="absolute inset-0 z-[1] cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={panStart}
          onPointerMove={panMove}
          onPointerUp={panEnd}
          onPointerCancel={panEnd}
        >
          <div
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={{
              width: natural ? dispW : 0,
              height: natural ? dispH : 0,
              marginLeft: natural ? -dispW / 2 + offsetX : 0,
              marginTop: natural ? -dispH / 2 + offsetY : 0,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
              opacity: natural ? 1 : 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs only */}
            {/* biome-ignore lint/performance/noImgElement: Next/Image cannot optimize blob: object URLs */}
            <img
              src={imageSrc}
              alt=""
              width={nw || undefined}
              height={nh || undefined}
              draggable={false}
              onLoad={onImageLoad}
              className="block h-full w-full max-h-none max-w-none select-none object-fill"
            />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-[5] rounded-2xl shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]" />

      <GuideOverlay
        displayScale={displayScale}
        guides={guides}
        onGuidesChange={onGuidesChange}
        guideColor={guideColor}
      />
    </div>
  );
}
