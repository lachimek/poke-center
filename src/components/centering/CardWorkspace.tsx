"use client";

import { FoldHorizontal, FoldVertical } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GUIDES,
  DEFAULT_VIEW_TRANSFORM,
} from "@/lib/centering/constants";
import { warpToCardSize } from "@/lib/centering/perspective";
import type {
  CardSide,
  CardSideState,
  PerspectiveQuad,
  SideResult,
  ViewerMagnify,
  ViewerMagnifyFactor,
  ViewTransform,
} from "@/lib/centering/types";
import { CardViewer } from "./CardViewer";
import { PerspectiveCornerEditor } from "./PerspectiveCornerEditor";
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
  helper: string;
  side: CardSide;
  viewerMagnify: ViewerMagnify | null;
  onViewerMagnify: (factor: ViewerMagnifyFactor | null) => void;
  sideResult: SideResult;
  state: CardSideState;
  setState: Dispatch<SetStateAction<CardSideState>>;
};

export function CardWorkspace({
  title,
  sideLabel,
  helper,
  side,
  viewerMagnify,
  onViewerMagnify,
  sideResult,
  state,
  setState,
}: CardWorkspaceProps) {
  const viewerMagnifyActive =
    viewerMagnify?.side === side ? viewerMagnify.factor : null;
  const [fitRequestId, setFitRequestId] = useState(0);
  const [perspectiveMode, setPerspectiveMode] = useState(false);
  const [perspectiveSession, setPerspectiveSession] = useState(0);
  const [perspectiveDraft, setPerspectiveDraft] =
    useState<PerspectiveQuad | null>(null);
  const [perspectiveValid, setPerspectiveValid] = useState(false);
  const [perspectiveHint, setPerspectiveHint] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.rawImageSrc) {
      setPerspectiveMode(false);
      setPerspectiveDraft(null);
      setPerspectiveValid(false);
      setPerspectiveHint(null);
    }
  }, [state.rawImageSrc]);

  const onUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setPerspectiveMode(false);
      setPerspectiveDraft(null);
      setPerspectiveValid(false);
      setPerspectiveHint(null);
      setState((s) => {
        if (s.rawImageSrc) URL.revokeObjectURL(s.rawImageSrc);
        if (s.imageSrc && s.imageSrc !== s.rawImageSrc) {
          URL.revokeObjectURL(s.imageSrc);
        }
        return {
          ...s,
          rawImageSrc: url,
          imageSrc: url,
          perspectiveCorners: null,
          transform: { ...DEFAULT_VIEW_TRANSFORM },
          guides: { ...DEFAULT_GUIDES },
        };
      });
    },
    [setState],
  );

  const onTransformChange = useCallback(
    (transform: ViewTransform) => {
      setState((s) => ({ ...s, transform }));
    },
    [setState],
  );

  const onGuidesChange = useCallback(
    (guides: CardSideState["guides"]) => {
      setState((s) => ({ ...s, guides }));
    },
    [setState],
  );

  const onGuideColorChange = useCallback(
    (hex: string) => {
      setState((s) => ({ ...s, guideColor: hex }));
    },
    [setState],
  );

  const onResetView = useCallback(() => {
    setFitRequestId((n) => n + 1);
  }, []);

  const onResetGuides = useCallback(() => {
    setState((s) => ({ ...s, guides: { ...DEFAULT_GUIDES } }));
  }, [setState]);

  const onOpenPerspective = useCallback(() => {
    if (!state.rawImageSrc) return;
    setPerspectiveSession((n) => n + 1);
    setPerspectiveMode(true);
    setPerspectiveDraft(null);
    setPerspectiveValid(false);
    setPerspectiveHint(null);
  }, [state.rawImageSrc]);

  const onPerspectiveCancel = useCallback(() => {
    setPerspectiveMode(false);
    setPerspectiveDraft(null);
    setPerspectiveValid(false);
    setPerspectiveHint(null);
  }, []);

  const onPerspectiveDraftChange = useCallback(
    (quad: PerspectiveQuad, valid: boolean, hint: string | null) => {
      setPerspectiveDraft(quad);
      setPerspectiveValid(valid);
      setPerspectiveHint(hint);
    },
    [],
  );

  const onPerspectiveApply = useCallback(() => {
    if (!state.rawImageSrc || !perspectiveDraft || !perspectiveValid) {
      return;
    }
    const quad = perspectiveDraft;
    const src = state.rawImageSrc;
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      try {
        const canvas = warpToCardSize(img, quad);
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const newUrl = URL.createObjectURL(blob);
            setState((s) => {
              if (s.imageSrc && s.imageSrc !== s.rawImageSrc) {
                URL.revokeObjectURL(s.imageSrc);
              }
              return {
                ...s,
                imageSrc: newUrl,
                perspectiveCorners: quad,
                transform: { ...DEFAULT_VIEW_TRANSFORM },
                guides: { ...DEFAULT_GUIDES },
              };
            });
            setFitRequestId((n) => n + 1);
            setPerspectiveMode(false);
            setPerspectiveDraft(null);
            setPerspectiveValid(false);
            setPerspectiveHint(null);
          },
          "image/png",
          1,
        );
      } catch {
        setPerspectiveHint("Could not build rectified image.");
      }
    };
    img.onerror = () => {
      setPerspectiveHint("Could not load image for warp.");
    };
  }, [perspectiveDraft, perspectiveValid, setState, state.rawImageSrc]);

  const onResetRectification = useCallback(() => {
    setState((s) => {
      const rectified = s.imageSrc;
      if (!s.rawImageSrc || !rectified || rectified === s.rawImageSrc) {
        return s;
      }
      URL.revokeObjectURL(rectified);
      return {
        ...s,
        imageSrc: s.rawImageSrc,
        transform: { ...DEFAULT_VIEW_TRANSFORM },
        guides: { ...DEFAULT_GUIDES },
      };
    });
    setFitRequestId((n) => n + 1);
  }, [setState]);

  const isRectified =
    !!state.rawImageSrc &&
    !!state.imageSrc &&
    state.imageSrc !== state.rawImageSrc;

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
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            {sideLabel}
          </div>
          <h2 className="text-lg font-medium text-zinc-100">{title}</h2>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-400">
          {helper}
        </div>
      </div>

      <Toolbar
        hasImage={!!state.imageSrc}
        onReplaceImage={() => replaceInputRef.current?.click()}
        transform={state.transform}
        onTransformChange={onTransformChange}
        onResetView={onResetView}
        onResetGuides={onResetGuides}
        guideColor={state.guideColor}
        onGuideColorChange={onGuideColorChange}
        viewerMagnifyActive={viewerMagnifyActive}
        onViewerMagnify={onViewerMagnify}
        perspectiveMode={perspectiveMode}
        perspectiveApplyEnabled={perspectiveValid && !!perspectiveDraft}
        perspectiveHint={perspectiveHint}
        isRectified={isRectified}
        onOpenPerspective={onOpenPerspective}
        onPerspectiveApply={onPerspectiveApply}
        onPerspectiveCancel={onPerspectiveCancel}
        onResetRectification={onResetRectification}
      />

      {perspectiveMode && state.rawImageSrc ? (
        <PerspectiveCornerEditor
          key={perspectiveSession}
          rawImageSrc={state.rawImageSrc}
          savedQuad={state.perspectiveCorners}
          onDraftChange={onPerspectiveDraftChange}
        />
      ) : (
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
        />
      )}

      <SideMetrics result={sideResult} />
    </section>
  );
}
