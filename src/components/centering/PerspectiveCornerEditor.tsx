"use client";

import { ChevronRight, LayoutGrid } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  isPerspectiveQuadValid,
  naturalToOverlayPx,
} from "@/lib/centering/perspective";
import type { PerspectiveQuad } from "@/lib/centering/types";
import {
  type CornerId,
  type LiveStateRef,
  CORNER_ORDER,
  CORNER_LABELS,
  useCornerDrag,
} from "@/hooks/useCornerDrag";
import { useImageLayout } from "@/hooks/useImageLayout";
import { QuadOverlaySvg } from "./QuadOverlaySvg";

const ZOOM_SCALE = 2.85;

type PerspectiveCornerEditorProps = {
  rawImageSrc: string;
  savedQuad: PerspectiveQuad | null;
  onDraftChange: (
    quad: PerspectiveQuad,
    valid: boolean,
    hint: string | null,
  ) => void;
  embeddedInModal?: boolean;
  onStablePreviewChange?: (
    quad: PerspectiveQuad | null,
    valid: boolean,
    hint: string | null,
  ) => void;
};

function localImgRect(w: number, h: number): DOMRect {
  return new DOMRect(0, 0, w, h);
}

export function PerspectiveCornerEditor({
  rawImageSrc,
  savedQuad,
  onDraftChange,
  embeddedInModal = false,
  onStablePreviewChange,
}: PerspectiveCornerEditorProps) {
  const [focusCorner, setFocusCorner] = useState<CornerId>("tl");
  const [fullCardView, setFullCardView] = useState(true);

  const {
    imgRef,
    viewportRef,
    natural,
    quad,
    setQuad,
    displaySize,
    viewportSize,
    bootstrapFromImage,
  } = useImageLayout({
    rawImageSrc,
    savedQuad,
    fullCardView,
    onDraftChange,
  });

  const liveRef = useRef<LiveStateRef>({
    natural: null,
    displaySize: { w: 0, h: 0 },
    viewportSize: { w: 0, h: 0 },
    focusCorner: "tl",
    quad: null,
    fullCardView: true,
  });
  liveRef.current = {
    natural,
    displaySize,
    viewportSize,
    focusCorner,
    quad,
    fullCardView,
  };

  const { isDragging, startDrag, zoomPanFrozenRef } = useCornerDrag({
    imgRef,
    liveRef,
    setQuad,
  });

  useLayoutEffect(() => {
    if (!onStablePreviewChange) return;
    if (isDragging) return;
    if (!quad || !natural) {
      onStablePreviewChange(null, false, null);
      return;
    }
    const r = isPerspectiveQuadValid(quad, natural.w, natural.h);
    onStablePreviewChange(quad, r.ok, r.ok ? null : r.hint);
  }, [isDragging, natural, onStablePreviewChange, quad]);

  const cycleFocusCorner = useCallback(() => {
    setFocusCorner((prev) => {
      const i = CORNER_ORDER.indexOf(prev);
      return CORNER_ORDER[(i + 1) % 4] ?? "tl";
    });
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
      {!embeddedInModal ? (
        <p className="text-xs text-zinc-500">
          Adjust corners on the full card first. When you need more precision,
          switch to <span className="text-zinc-400">Corner zoom</span> — use the
          grip outside each vertex so the crosshair stays visible, and{" "}
          <span className="text-zinc-400">Next corner</span> to cycle focus.
        </p>
      ) : null}

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
            {CORNER_LABELS[focusCorner]}
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
            <QuadOverlaySvg
              quad={quad}
              localRect={localRect}
              nw={nw}
              nh={nh}
              dw={dw}
              dh={dh}
              focusCorner={focusCorner}
              startDrag={startDrag}
              mode="full"
            />
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
              <QuadOverlaySvg
                quad={quad}
                localRect={localRect}
                nw={nw}
                nh={nh}
                dw={dw}
                dh={dh}
                focusCorner={focusCorner}
                startDrag={startDrag}
                mode="zoom"
              />
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
