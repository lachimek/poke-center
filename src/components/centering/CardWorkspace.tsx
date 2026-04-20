"use client";

import { FoldHorizontal, FoldVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePerspectiveSession } from "@/hooks/usePerspectiveSession";
import { DEFAULT_GUIDES } from "@/lib/centering/constants";
import { readFileAsDataUrl } from "@/lib/centering/imageUtils";
import type {
  CardSide,
  CardSideState,
  SideResult,
  ViewerMagnify,
  ViewerMagnifyFactor,
  ViewTransform,
} from "@/lib/centering/types";
import { notifyError } from "@/lib/toast";
import { useCenteringStore } from "@/stores/centeringStore";
import { CardViewer } from "./CardViewer";
import { PerspectiveModal } from "./PerspectiveModal";
import { Toolbar } from "./Toolbar";

function SideMetrics({ result }: { result: SideResult }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          <FoldHorizontal
            className="h-4 w-4 shrink-0 text-zinc-500"
            aria-hidden
          />
          Horizontal
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-2xl font-semibold tabular-nums text-zinc-100">
            {result.horizontalDisplay}
          </div>
          <div className="text-xs text-zinc-400 sm:text-sm">
            L {Math.round(result.leftMargin)}px · R{" "}
            {Math.round(result.rightMargin)}px
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          <FoldVertical
            className="h-4 w-4 shrink-0 text-zinc-500"
            aria-hidden
          />
          Vertical
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-2xl font-semibold tabular-nums text-zinc-100">
            {result.verticalDisplay}
          </div>
          <div className="text-xs text-zinc-400 sm:text-sm">
            T {Math.round(result.topMargin)}px · B{" "}
            {Math.round(result.bottomMargin)}px
          </div>
        </div>
      </div>
    </div>
  );
}

type CardWorkspaceProps = {
  title: string;
  sideLabel: string;
  side: CardSide;
  viewerMagnify: ViewerMagnify | null;
  onViewerMagnify: (factor: ViewerMagnifyFactor | null) => void;
  sideResult: SideResult;
  onPerspectiveModeChange?: (open: boolean) => void;
};

export function CardWorkspace({
  title,
  sideLabel,
  side,
  viewerMagnify,
  onViewerMagnify,
  sideResult,
  onPerspectiveModeChange,
}: CardWorkspaceProps) {
  const state = useCenteringStore((s) => s[side]);
  const setSide = useCenteringStore((s) => s.setSide);

  const viewerMagnifyActive =
    viewerMagnify?.side === side ? viewerMagnify.factor : null;
  const viewerScale = viewerMagnify?.side === side ? viewerMagnify.factor : 1;
  const [fitRequestId, setFitRequestId] = useState(0);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const prevViewerScaleRef = useRef<number | null>(null);

  const onFitRequest = useCallback(() => {
    setFitRequestId((n) => n + 1);
  }, []);

  const {
    perspectiveMode,
    perspectiveSession,
    perspectiveDraft,
    perspectiveValid,
    perspectiveHint,
    perspectivePreviewQuad,
    perspectivePreviewValid,
    detectingCorners,
    detectedQuad,
    openPerspective,
    cancelPerspective,
    applyPerspective,
    autoDetectCorners,
    onPerspectiveDraftChange,
    onStablePerspectivePreviewChange,
    openPerspectiveAfterUpload,
  } = usePerspectiveSession({
    side,
    rawImageSrc: state.rawImageSrc,
    onFitRequest,
  });

  useEffect(() => {
    onPerspectiveModeChange?.(perspectiveMode);
  }, [perspectiveMode, onPerspectiveModeChange]);

  useEffect(() => {
    if (prevViewerScaleRef.current === null) {
      prevViewerScaleRef.current = viewerScale;
      return;
    }
    if (prevViewerScaleRef.current !== viewerScale) {
      prevViewerScaleRef.current = viewerScale;
      setFitRequestId((n) => n + 1);
    }
  }, [viewerScale]);

  const onUpload = useCallback(
    (file: File) => {
      void readFileAsDataUrl(file).then(
        (dataUrl) => {
          openPerspectiveAfterUpload(dataUrl);
        },
        () => {
          notifyError("Could not read that image file.");
        },
      );
    },
    [openPerspectiveAfterUpload],
  );

  const onTransformChange = useCallback(
    (transform: ViewTransform) => {
      setSide(side, (s) => ({ ...s, transform }));
    },
    [setSide, side],
  );

  const onGuidesChange = useCallback(
    (guides: CardSideState["guides"]) => {
      setSide(side, (s) => ({ ...s, guides }));
    },
    [setSide, side],
  );

  const onGuideColorChange = useCallback(
    (hex: string) => {
      setSide(side, (s) => ({ ...s, guideColor: hex }));
    },
    [setSide, side],
  );

  const onResetView = useCallback(() => {
    setFitRequestId((n) => n + 1);
  }, []);

  const onResetGuides = useCallback(() => {
    setSide(side, (s) => ({ ...s, guides: { ...DEFAULT_GUIDES } }));
  }, [setSide, side]);

  return (
    <section className="flex min-w-0 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-zinc-100 tracking-[2px]">
            {title}
          </h2>
        </div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          {sideLabel}
        </div>
      </div>

      <Toolbar
        hasImage={!!state.imageSrc}
        onReplaceImage={() => replaceInputRef.current?.click()}
        onResetView={onResetView}
        onResetGuides={onResetGuides}
        guideColor={state.guideColor}
        onGuideColorChange={onGuideColorChange}
        viewerMagnifyActive={viewerMagnifyActive}
        onViewerMagnify={onViewerMagnify}
        perspectiveMode={perspectiveMode}
        onOpenPerspective={openPerspective}
      />

      {perspectiveMode && state.rawImageSrc ? (
        <PerspectiveModal
          rawImageSrc={state.rawImageSrc}
          savedQuad={state.perspectiveCorners}
          sessionKey={perspectiveSession}
          onDraftChange={onPerspectiveDraftChange}
          onStablePreviewChange={onStablePerspectivePreviewChange}
          perspectiveDraft={perspectiveDraft}
          perspectiveValid={perspectiveValid}
          perspectivePreviewQuad={perspectivePreviewQuad}
          perspectivePreviewValid={perspectivePreviewValid}
          perspectiveHint={perspectiveHint}
          detectingCorners={detectingCorners}
          detectedQuad={detectedQuad}
          onAutoDetectCorners={autoDetectCorners}
          onConfirm={applyPerspective}
          onCancel={cancelPerspective}
        />
      ) : null}

      {!perspectiveMode ? (
        <CardViewer
          key={state.imageSrc ?? "empty"}
          imageSrc={state.imageSrc}
          transform={state.transform}
          onTransformChange={onTransformChange}
          guides={state.guides}
          onGuidesChange={onGuidesChange}
          guideColor={state.guideColor}
          fitRequestId={fitRequestId}
          onUpload={onUpload}
          viewerScale={viewerScale}
        />
      ) : null}

      <SideMetrics result={sideResult} />
    </section>
  );
}
