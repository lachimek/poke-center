"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
} from "@/lib/centering/constants";
import { warpToCardSize } from "@/lib/centering/perspective";
import type { PerspectiveQuad } from "@/lib/centering/types";

/** Fallback until the preview frame is measured. */
const FALLBACK_W = Math.round(CARD_LOGICAL_WIDTH / 2);
const FALLBACK_H = Math.round(CARD_LOGICAL_HEIGHT / 2);

type PerspectiveLivePreviewProps = {
  rawImageSrc: string;
  quad: PerspectiveQuad | null;
  valid: boolean;
  className?: string;
};

function containCardPixels(cw: number, ch: number): { w: number; h: number } {
  if (cw < 2 || ch < 2) {
    return { w: FALLBACK_W, h: FALLBACK_H };
  }
  const k = Math.min(cw / CARD_LOGICAL_WIDTH, ch / CARD_LOGICAL_HEIGHT);
  return {
    w: Math.max(2, Math.floor(CARD_LOGICAL_WIDTH * k)),
    h: Math.max(2, Math.floor(CARD_LOGICAL_HEIGHT * k)),
  };
}

function drawPlaceholder(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  message: string,
): void {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#71717a";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, w / 2, h / 2);
}

export function PerspectiveLivePreview({
  rawImageSrc,
  quad,
  valid,
  className = "",
}: PerspectiveLivePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imgLoadedRef = useRef<HTMLImageElement | null>(null);
  const srcLoadedRef = useRef<string>("");
  const latestSrcRef = useRef(rawImageSrc);
  latestSrcRef.current = rawImageSrc;

  const [outSize, setOutSize] = useState({ w: FALLBACK_W, h: FALLBACK_H });

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setOutSize(containCardPixels(w, h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let raf: number | null = null;
    const { w: outW, h: outH } = outSize;

    const run = () => {
      if (cancelled) return;
      if (!valid || !quad) {
        drawPlaceholder(canvas, outW, outH, "Adjust corners for preview");
        return;
      }
      const img = imgLoadedRef.current;
      if (!img?.naturalWidth) {
        drawPlaceholder(canvas, outW, outH, "Loading…");
        return;
      }
      try {
        const out = warpToCardSize(img, quad, outW, outH);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = outW;
        canvas.height = outH;
        ctx.drawImage(out, 0, 0);
      } catch {
        drawPlaceholder(canvas, outW, outH, "Preview unavailable");
      }
    };

    const schedule = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = null;
        run();
      });
    };

    if (srcLoadedRef.current !== rawImageSrc) {
      srcLoadedRef.current = rawImageSrc;
      imgLoadedRef.current = null;
      const loadSrc = rawImageSrc;
      const img = new Image();
      img.decoding = "async";
      img.src = rawImageSrc;
      img.onload = () => {
        if (loadSrc !== latestSrcRef.current) return;
        imgLoadedRef.current = img;
        if (!cancelled) schedule();
      };
      img.onerror = () => {
        if (loadSrc !== latestSrcRef.current) return;
        imgLoadedRef.current = null;
        if (!cancelled) {
          drawPlaceholder(canvas, outW, outH, "Could not load image");
        }
      };
      if (img.complete && img.naturalWidth > 0) {
        imgLoadedRef.current = img;
      } else {
        drawPlaceholder(canvas, outW, outH, "Loading…");
      }
    }

    schedule();

    return () => {
      cancelled = true;
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
  }, [outSize, quad, rawImageSrc, valid]);

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 ${className}`}
    >
      <div className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        Rectified preview
      </div>
      <div className="flex min-h-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
        <div
          ref={frameRef}
          className="flex min-h-0 w-full flex-1 items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            className="h-auto max-h-full w-auto max-w-full object-contain"
            aria-label="Rectified card preview"
          />
        </div>
      </div>
    </div>
  );
}
