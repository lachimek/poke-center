"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export const btnBase =
  "rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40";

type ModalShellProps = {
  onClose: () => void;
  backdropLabel: string;
  title: string;
  subtitle?: string;
  dialogClassName?: string;
  zIndex?: number;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export function ModalShell({
  onClose,
  backdropLabel,
  title,
  subtitle,
  dialogClassName = "max-h-[min(92vh,900px)] max-w-5xl",
  zIndex = 100,
  footer,
  children,
}: ModalShellProps) {
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

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex }}
      role="presentation"
    >
      <button
        type="button"
        aria-label={backdropLabel}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-[1] flex w-full flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 ${dialogClassName}`}
      >
        <header className="shrink-0 border-b border-zinc-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-100">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 px-5 py-4">
          {footer}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
