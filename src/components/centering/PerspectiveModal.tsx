"use client";

import type { PerspectiveQuad } from "@/lib/centering/types";
import { ModalShell, btnBase } from "@/components/ui/ModalShell";
import { PerspectiveCornerEditor } from "./PerspectiveCornerEditor";
import { PerspectiveLivePreview } from "./PerspectiveLivePreview";

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
  const confirmEnabled = perspectiveValid && perspectiveDraft !== null;

  return (
    <ModalShell
      onClose={onCancel}
      backdropLabel="Close perspective editor"
      title="Perspective correction"
      subtitle="Drag the corner handles, then confirm to rectify the card."
      footer={
        <>
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
        </>
      }
    >
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
    </ModalShell>
  );
}
