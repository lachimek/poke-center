"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type SavedCardThumbnailPreviewProps = {
  src: string;
  alt?: string;
  children: React.ReactNode;
};

export function SavedCardThumbnailPreview({
  src,
  alt = "",
  children,
}: SavedCardThumbnailPreviewProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div className="relative">
        {children}
        <button
          type="button"
          aria-label="Zoom image preview"
          onClick={() => setOpen(true)}
          className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600/70 bg-zinc-950/85 text-zinc-200 transition hover:border-zinc-400 hover:text-white"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
              <button
                type="button"
                aria-label="Close image preview"
                className="absolute inset-0"
                onClick={() => setOpen(false)}
              />
              {/* biome-ignore lint/performance/noImgElement: data URLs from DB */}
              <img
                src={src}
                alt={alt}
                className="relative z-[1] max-h-[min(85vh,1200px)] max-w-[min(92vw,920px)] object-contain shadow-2xl shadow-black/60"
              />
              <button
                type="button"
                aria-label="Close preview"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 z-[2] inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-500/70 bg-zinc-900/90 text-zinc-100 transition hover:border-zinc-300 hover:bg-zinc-800"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
