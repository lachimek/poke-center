"use client";

import { Camera, Check, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useId, useRef } from "react";
import type { CapturedSide } from "@/lib/capture/types";

type CaptureSideTileProps = {
  title: string;
  subtitle: string;
  captured: CapturedSide | null;
  processing: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
  onRetake: () => void;
};

export function CaptureSideTile({
  title,
  subtitle,
  captured,
  processing,
  disabled,
  onPick,
  onRetake,
}: CaptureSideTileProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const openCamera = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) onPick(file);
    },
    [onPick],
  );

  const inputDisabled = disabled || processing;

  return (
    <section
      aria-labelledby={`${inputId}-label`}
      className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 shadow-lg shadow-black/20"
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onChange}
        disabled={inputDisabled}
      />
      <div className="mb-3 flex items-baseline justify-between">
        <h2
          id={`${inputId}-label`}
          className="text-lg font-semibold tracking-wide text-zinc-100"
        >
          {title}
        </h2>
        <span className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          {subtitle}
        </span>
      </div>
      {captured ? (
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            {/* biome-ignore lint/performance/noImgElement: local preview from ObjectURL */}
            <img
              src={captured.previewUrl}
              alt={`${title} preview`}
              className="h-full w-full object-contain"
              draggable={false}
            />
            <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-200 backdrop-blur">
              <Check className="h-3 w-3" aria-hidden /> Captured
            </div>
          </div>
          <button
            type="button"
            onClick={onRetake}
            disabled={inputDisabled}
            className="flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition active:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openCamera}
          disabled={inputDisabled}
          aria-busy={processing}
          className="flex aspect-[3/4] touch-manipulation flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950 px-4 py-8 text-sm font-medium text-zinc-300 transition active:border-emerald-500/40 active:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-200">
            {processing ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-6 w-6" aria-hidden />
            )}
          </div>
          <span>{processing ? "Processing photo…" : "Tap to take photo"}</span>
          {!processing ? (
            <span className="text-xs text-zinc-500">
              Uses your camera; photo is re-encoded locally before upload.
            </span>
          ) : null}
        </button>
      )}
    </section>
  );
}
