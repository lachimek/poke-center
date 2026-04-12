"use client";

import { Download } from "lucide-react";
import { downloadBlob } from "@/lib/centering/exportCompositeImage";
import { ModalShell, btnBase } from "@/components/ui/ModalShell";

type ExportPreviewModalProps = {
  previewUrl: string;
  filename: string;
  blob: Blob;
  onClose: () => void;
};

export function ExportPreviewModal({
  previewUrl,
  filename,
  blob,
  onClose,
}: ExportPreviewModalProps) {
  const onDownload = () => {
    downloadBlob(blob, filename);
  };

  return (
    <ModalShell
      onClose={onClose}
      backdropLabel="Close export preview"
      title="Export preview"
      subtitle="Review the composite, then download the full-resolution PNG."
      dialogClassName="max-h-[min(94vh,920px)] max-w-6xl"
      zIndex={101}
      footer={
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="truncate text-xs text-zinc-500" title={filename}>
            {filename}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${btnBase} border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800`}
            >
              Close
            </button>
            <button
              type="button"
              onClick={onDownload}
              className={`${btnBase} inline-flex items-center justify-center gap-2 border-emerald-500/35 bg-emerald-600/90 text-white hover:bg-emerald-500`}
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Download PNG
            </button>
          </div>
        </div>
      }
    >
      <div className="flex justify-center rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
        {/* biome-ignore lint/performance/noImgElement: blob preview URL */}
        <img
          src={previewUrl}
          alt="Export preview: front and back with guides and summary"
          className="max-h-[min(70vh,780px)] w-full max-w-full object-contain"
        />
      </div>
    </ModalShell>
  );
}
