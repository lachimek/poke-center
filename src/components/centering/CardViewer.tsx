"use client";

import { Loader2 } from "lucide-react";
import { useRef } from "react";
import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
} from "@/lib/centering/constants";
import type { GuideLines, ViewTransform } from "@/lib/centering/types";
import { useCardViewerTransform } from "@/hooks/useCardViewerTransform";
import { GuideOverlay } from "./GuideOverlay";

/** Max width of the card bezel at 1x viewer zoom (matches previous fixed `max-w-[472px]`). */
const VIEWER_BASE_MAX_WIDTH_PX = 472;

type CardViewerProps = {
  imageSrc: string | null;
  transform: ViewTransform;
  onTransformChange: (t: ViewTransform) => void;
  guides: GuideLines;
  onGuidesChange: (next: GuideLines) => void;
  guideColor: string;
  fitRequestId: number;
  onUpload: (file: File) => void;
  /** 1 = default; 3 enlarges the whole viewer (toolbar focus mode). */
  viewerScale?: number;
};

export function CardViewer({
  imageSrc,
  transform,
  onTransformChange,
  guides,
  onGuidesChange,
  guideColor,
  fitRequestId,
  onUpload,
  viewerScale = 1,
}: CardViewerProps) {
  const emptyFileRef = useRef<HTMLInputElement>(null);

  const {
    containerRef,
    framePx,
    natural,
    onImageLoad,
    panHandlers,
  } = useCardViewerTransform({
    imageSrc,
    transform,
    onTransformChange,
    fitRequestId,
    viewerScale,
  });

  const displayScale = framePx.w / CARD_LOGICAL_WIDTH;

  const { scale, offsetX, offsetY } = transform;
  const nw = natural?.w ?? 0;
  const nh = natural?.h ?? 0;
  const dispW = nw * scale;
  const dispH = nh * scale;

  const bezelMaxWidth = `min(100%, ${VIEWER_BASE_MAX_WIDTH_PX * viewerScale}px)`;

  return (
    <div
      className="relative flex w-full items-center justify-center rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(39,39,42,0.5),rgba(9,9,11,0.95))] p-4 sm:p-6"
      style={{
        minHeight: `min(${Math.round(520 * viewerScale)}px, 88vh)`,
      }}
    >
      <div className="relative w-full" style={{ maxWidth: bezelMaxWidth }}>
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
                {...panHandlers}
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
