import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  defaultPerspectiveQuad,
  isPerspectiveQuadValid,
} from "@/lib/centering/perspective";
import type { PerspectiveQuad } from "@/lib/centering/types";

type UseImageLayoutParams = {
  rawImageSrc: string;
  savedQuad: PerspectiveQuad | null;
  fullCardView: boolean;
  onDraftChange: (
    quad: PerspectiveQuad,
    valid: boolean,
    hint: string | null,
  ) => void;
};

export function useImageLayout({
  rawImageSrc,
  savedQuad,
  fullCardView,
  onDraftChange,
}: UseImageLayoutParams) {
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastRawSrcRef = useRef<string | null>(null);
  const draftRafRef = useRef<number | null>(null);

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [quad, setQuad] = useState<PerspectiveQuad | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (rawImageSrc !== lastRawSrcRef.current) {
      lastRawSrcRef.current = rawImageSrc;
      setNatural(null);
      setQuad(null);
    }
  }, [rawImageSrc]);

  const bootstrapFromImage = useCallback(() => {
    const el = imgRef.current;
    if (!el?.naturalWidth) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    setNatural({ w, h });
    setQuad((prev) => {
      if (prev) return prev;
      return savedQuad ?? defaultPerspectiveQuad(w, h);
    });
  }, [savedQuad]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: also when rawImageSrc changes (new blob)
  useLayoutEffect(() => {
    bootstrapFromImage();
  }, [bootstrapFromImage, rawImageSrc]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new <img> when toggling zoom/full or replacing blob
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDisplaySize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    setDisplaySize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, [fullCardView, rawImageSrc]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: viewport only in corner-zoom mode; measure before paint
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () =>
      setViewportSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullCardView]);

  useEffect(() => {
    if (!quad || !natural) return;
    if (draftRafRef.current !== null) cancelAnimationFrame(draftRafRef.current);
    draftRafRef.current = requestAnimationFrame(() => {
      draftRafRef.current = null;
      const r = isPerspectiveQuadValid(quad, natural.w, natural.h);
      onDraftChange(quad, r.ok, r.ok ? null : r.hint);
    });
    return () => {
      if (draftRafRef.current !== null) {
        cancelAnimationFrame(draftRafRef.current);
        draftRafRef.current = null;
      }
    };
  }, [quad, natural, onDraftChange]);

  return {
    imgRef,
    viewportRef,
    natural,
    quad,
    setQuad,
    displaySize,
    viewportSize,
    bootstrapFromImage,
  };
}
