"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const SHOW_MS = 60;
const HIDE_MS = 140;

type HoverTooltipProps = {
  /** Visible trigger text or node (rendered inside an unstyled button). */
  label: ReactNode;
  /** Tooltip body; keep concise for small panels. */
  content: ReactNode;
  /** Tooltip panel position relative to the label. */
  side?: "top" | "bottom";
  className?: string;
};

export function HoverTooltip({
  label,
  content,
  side = "top",
  className = "",
}: HoverTooltipProps) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShow = useCallback(() => {
    if (showRef.current) {
      clearTimeout(showRef.current);
      showRef.current = null;
    }
  }, []);

  const clearHide = useCallback(() => {
    if (hideRef.current) {
      clearTimeout(hideRef.current);
      hideRef.current = null;
    }
  }, []);

  const requestOpen = useCallback(() => {
    clearHide();
    clearShow();
    showRef.current = setTimeout(() => {
      showRef.current = null;
      setOpen(true);
    }, SHOW_MS);
  }, [clearHide, clearShow]);

  const requestClose = useCallback(() => {
    clearShow();
    clearHide();
    hideRef.current = setTimeout(() => {
      hideRef.current = null;
      setOpen(false);
    }, HIDE_MS);
  }, [clearHide, clearShow]);

  useEffect(() => {
    return () => {
      clearShow();
      clearHide();
    };
  }, [clearHide, clearShow]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearShow();
        clearHide();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, clearHide, clearShow]);

  const positionClass =
    side === "top"
      ? "bottom-full left-0 mb-1.5 origin-bottom"
      : "top-full left-0 mt-1.5 origin-top";

  return (
    <span className={`relative inline-flex max-w-full ${className}`}>
      <button
        type="button"
        className="cursor-help border-b border-dotted border-zinc-500/60 bg-transparent p-0 text-left font-medium text-inherit decoration-0 transition hover:border-zinc-400 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={requestOpen}
        onMouseLeave={requestClose}
        onFocus={requestOpen}
        onBlur={requestClose}
      >
        {label}
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className={`absolute z-[200] ${positionClass} w-[min(17rem,calc(100vw-2rem))]`}
        >
          <span className="block rounded-xl border border-zinc-600 bg-zinc-800/98 px-3 py-2.5 text-left text-[11px] leading-relaxed text-zinc-200 shadow-lg shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
            {content}
          </span>
        </span>
      ) : null}
    </span>
  );
}
