"use client";

import { Loader2 } from "lucide-react";
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
  fitRequestId: number;
  onUpload: (file: File) => void;
};

/** Scale image (contain) so it fills the frame; one axis touches the inner edge. */
function fitScale(
  frameW: number,
  frameH: number,
  natW: number,
  natH: number,
): number {
  if (natW <= 0 || natH <= 0 || frameW <= 0 || frameH <= 0) return 1;
  return Math.min(frameW / natW, frameH / natH);
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
    const applyFitFromImage = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= 0 || h <= 0) return;
      setNatural({ w, h });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = containerRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const fw = Math.max(1, r.width);
          const fh = Math.max(1, r.height);
          const s = fitScale(fw, fh, w, h);
          onTransformChange({
            scale: s,
            offsetX: 0,
            offsetY: 0,
          });
        });
      });
    };

    void img.decode().then(applyFitFromImage).catch(applyFitFromImage);
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

  const { scale, offsetX, offsetY } = transform;
  const nw = natural?.w ?? 0;
  const nh = natural?.h ?? 0;
  const dispW = nw * scale;
  const dispH = nh * scale;

  return (
    <div className="relative flex min-h-[min(520px,62vh)] w-full items-center justify-center rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(39,39,42,0.5),rgba(9,9,11,0.95))] p-4 sm:p-6">
      <div className="relative w-full max-w-[472px]">
        <div className="relative rounded-[32px] border border-zinc-700 bg-zinc-950 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div
            className="pointer-events-none absolute inset-3 rounded-[26px] border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950"
            aria-hidden
          />

          <div
            ref={containerRef}
            className="relative z-[1] w-full overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950 shadow-inner"
            style={{
              aspectRatio: `${CARD_LOGICAL_WIDTH} / ${CARD_LOGICAL_HEIGHT}`,
            }}
          >
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,#0a0a0c_0%,#050506_100%)]"
              aria-hidden
            />

            {imageSrc && !natural ? (
              <output
                className="pointer-events-none absolute inset-0 z-[12] m-0 flex flex-col items-center justify-center gap-3 border-0 bg-zinc-950/90 p-0"
                aria-live="polite"
              >
                <Loader2
                  className="h-9 w-9 animate-spin text-emerald-400/80"
                  aria-hidden
                />
                <span className="text-xs text-zinc-500">Loading image…</span>
              </output>
            ) : null}

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
                <p className="text-xs tracking-wide text-zinc-500">
                  No image loaded
                </p>
                <p className="max-w-[260px] text-xs leading-relaxed text-zinc-600">
                  Upload a photo — perspective correction opens next. After
                  that, drag the four guides (L, R, T, B) on the rectified card.
                </p>
                <button
                  type="button"
                  onClick={() => emptyFileRef.current?.click()}
                  className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
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

            <div className="pointer-events-none absolute inset-0 z-[5] rounded-[22px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]" />

            {imageSrc ? (
              <GuideOverlay
                displayScale={displayScale}
                guides={guides}
                onGuidesChange={onGuidesChange}
                guideColor={guideColor}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
