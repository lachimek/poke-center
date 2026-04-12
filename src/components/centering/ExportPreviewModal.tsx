"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { downloadBlob } from "@/lib/centering/exportCompositeImage";

const btnBase =
  "rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40";

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
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
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

  const onDownload = () => {
    downloadBlob(blob, filename);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[101] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close export preview"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(94vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50"
      >
        <header className="shrink-0 border-b border-zinc-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-100">
            Export preview
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Review the composite, then download the full-resolution PNG.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex justify-center rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            {/* biome-ignore lint/performance/noImgElement: blob preview URL */}
            <img
              src={previewUrl}
              alt="Export preview: front and back with guides and summary"
              className="max-h-[min(70vh,780px)] w-full max-w-full object-contain"
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 px-5 py-4">
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
        </footer>
      </div>
    </div>,
    document.body,
  );
}
