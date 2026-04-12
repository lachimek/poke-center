"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { PerspectiveQuad } from "@/lib/centering/types";
import { PerspectiveCornerEditor } from "./PerspectiveCornerEditor";
import { PerspectiveLivePreview } from "./PerspectiveLivePreview";

const btnBase =
  "rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40";

type PerspectiveModalProps = {
  rawImageSrc: string;
  savedQuad: PerspectiveQuad | null;
  sessionKey: number;
  onDraftChange: (
    quad: PerspectiveQuad,
    valid: boolean,
    hint: string | null,
  ) => void;
  onStablePreviewChange: (
    quad: PerspectiveQuad | null,
    valid: boolean,
    hint: string | null,
  ) => void;
  perspectiveDraft: PerspectiveQuad | null;
  perspectiveValid: boolean;
  perspectivePreviewQuad: PerspectiveQuad | null;
  perspectivePreviewValid: boolean;
  perspectiveHint: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PerspectiveModal({
  rawImageSrc,
  savedQuad,
  sessionKey,
  onDraftChange,
  onStablePreviewChange,
  perspectiveDraft,
  perspectiveValid,
  perspectivePreviewQuad,
  perspectivePreviewValid,
  perspectiveHint,
  onConfirm,
  onCancel,
}: PerspectiveModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const confirmEnabled = perspectiveValid && perspectiveDraft !== null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close perspective editor"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50"
      >
        <header className="shrink-0 border-b border-zinc-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-100">
            Perspective correction
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Drag the corner handles, then confirm to rectify the card.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid min-h-[min(68vh,600px)] grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6">
            <div className="flex min-h-[min(40vh,360px)] min-w-0 flex-col lg:min-h-0">
              <PerspectiveCornerEditor
                key={sessionKey}
                embeddedInModal
                rawImageSrc={rawImageSrc}
                savedQuad={savedQuad}
                onDraftChange={onDraftChange}
                onStablePreviewChange={onStablePreviewChange}
              />
            </div>
            <PerspectiveLivePreview
              className="min-h-[min(44vh,400px)] lg:min-h-0"
              rawImageSrc={rawImageSrc}
              quad={perspectivePreviewQuad}
              valid={perspectivePreviewValid}
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 px-5 py-4">
          {perspectiveHint ? (
            <p className="mb-3 text-xs text-amber-200/85">{perspectiveHint}</p>
          ) : (
            <p className="mb-3 text-xs text-zinc-500">
              All four corners must form a valid quadrilateral inside the image.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`${btnBase} border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!confirmEnabled}
              onClick={onConfirm}
              className={`${btnBase} border-emerald-500/35 bg-emerald-600/90 text-white hover:bg-emerald-500 disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500`}
            >
              Confirm
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
