"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_GUIDES,
  DEFAULT_VIEW_TRANSFORM,
} from "@/lib/centering/constants";
import type {
  CardSide,
  CardSideState,
  ViewerMagnify,
  ViewerMagnifyFactor,
  ViewTransform,
} from "@/lib/centering/types";
import { CardViewer } from "./CardViewer";
import { Toolbar } from "./Toolbar";

type CardWorkspaceProps = {
  title: string;
  helper: string;
  side: CardSide;
  viewerMagnify: ViewerMagnify | null;
  onViewerMagnify: (factor: ViewerMagnifyFactor | null) => void;
  state: CardSideState;
  setState: Dispatch<SetStateAction<CardSideState>>;
};

export function CardWorkspace({
  title,
  helper,
  side,
  viewerMagnify,
  onViewerMagnify,
  state,
  setState,
}: CardWorkspaceProps) {
  const viewerMagnifyActive =
    viewerMagnify?.side === side ? viewerMagnify.factor : null;
  const [fitRequestId, setFitRequestId] = useState(0);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const onUpload = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setState((s) => {
        if (s.imageSrc) URL.revokeObjectURL(s.imageSrc);
        return {
          ...s,
          imageSrc: url,
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

  return (
    <section className="flex min-w-0 flex-col gap-3">
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

      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800/80 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-mono text-sm font-semibold tracking-tight text-zinc-100">
            {title}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {helper}
          </span>
        </div>
      </header>

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
      />

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
    </section>
  );
}
