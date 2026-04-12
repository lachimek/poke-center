import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_GUIDES,
  DEFAULT_VIEW_TRANSFORM,
} from "@/lib/centering/constants";
import { warpToCardSize } from "@/lib/centering/perspective";
import type {
  CardSide,
  PerspectiveQuad,
} from "@/lib/centering/types";
import { useCenteringStore } from "@/stores/centeringStore";

type UsePerspectiveSessionParams = {
  side: CardSide;
  rawImageSrc: string | null;
  onFitRequest: () => void;
};

export function usePerspectiveSession({
  side,
  rawImageSrc,
  onFitRequest,
}: UsePerspectiveSessionParams) {
  const setSide = useCenteringStore((s) => s.setSide);

  const [perspectiveMode, setPerspectiveMode] = useState(false);
  const [perspectiveSession, setPerspectiveSession] = useState(0);
  const [perspectiveDraft, setPerspectiveDraft] =
    useState<PerspectiveQuad | null>(null);
  const [perspectiveValid, setPerspectiveValid] = useState(false);
  const [perspectiveHint, setPerspectiveHint] = useState<string | null>(null);
  const [perspectivePreviewQuad, setPerspectivePreviewQuad] =
    useState<PerspectiveQuad | null>(null);
  const [perspectivePreviewValid, setPerspectivePreviewValid] = useState(false);

  const resetPerspectiveState = useCallback(() => {
    setPerspectiveDraft(null);
    setPerspectiveValid(false);
    setPerspectiveHint(null);
    setPerspectivePreviewQuad(null);
    setPerspectivePreviewValid(false);
  }, []);

  useEffect(() => {
    if (!rawImageSrc) {
      setPerspectiveMode(false);
      resetPerspectiveState();
    }
  }, [rawImageSrc, resetPerspectiveState]);

  const openPerspective = useCallback(() => {
    if (!rawImageSrc) return;
    setPerspectiveSession((n) => n + 1);
    setPerspectiveMode(true);
    resetPerspectiveState();
  }, [rawImageSrc, resetPerspectiveState]);

  const cancelPerspective = useCallback(() => {
    setPerspectiveMode(false);
    resetPerspectiveState();
  }, [resetPerspectiveState]);

  const onPerspectiveDraftChange = useCallback(
    (quad: PerspectiveQuad, valid: boolean, hint: string | null) => {
      setPerspectiveDraft(quad);
      setPerspectiveValid(valid);
      setPerspectiveHint(hint);
    },
    [],
  );

  const onStablePerspectivePreviewChange = useCallback(
    (quad: PerspectiveQuad | null, valid: boolean, _hint: string | null) => {
      setPerspectivePreviewQuad(quad);
      setPerspectivePreviewValid(valid);
    },
    [],
  );

  const applyPerspective = useCallback(() => {
    if (!rawImageSrc || !perspectiveDraft || !perspectiveValid) {
      return;
    }
    const quad = perspectiveDraft;
    const src = rawImageSrc;
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      try {
        const canvas = warpToCardSize(img, quad);
        const dataUrl = canvas.toDataURL("image/png");
        setSide(side, (s) => ({
          ...s,
          imageSrc: dataUrl,
          perspectiveCorners: quad,
          transform: { ...DEFAULT_VIEW_TRANSFORM },
          guides: { ...DEFAULT_GUIDES },
        }));
        onFitRequest();
        setPerspectiveMode(false);
        resetPerspectiveState();
      } catch {
        setPerspectiveHint("Could not build rectified image.");
      }
    };
    img.onerror = () => {
      setPerspectiveHint("Could not load image for warp.");
    };
  }, [perspectiveDraft, perspectiveValid, setSide, side, rawImageSrc, onFitRequest, resetPerspectiveState]);

  const openPerspectiveAfterUpload = useCallback(
    (dataUrl: string) => {
      setPerspectiveSession((n) => n + 1);
      setPerspectiveMode(true);
      resetPerspectiveState();
      setSide(side, (s) => ({
        ...s,
        rawImageSrc: dataUrl,
        imageSrc: dataUrl,
        perspectiveCorners: null,
        transform: { ...DEFAULT_VIEW_TRANSFORM },
        guides: { ...DEFAULT_GUIDES },
      }));
    },
    [setSide, side, resetPerspectiveState],
  );

  return {
    perspectiveMode,
    perspectiveSession,
    perspectiveDraft,
    perspectiveValid,
    perspectiveHint,
    perspectivePreviewQuad,
    perspectivePreviewValid,
    openPerspective,
    cancelPerspective,
    applyPerspective,
    onPerspectiveDraftChange,
    onStablePerspectivePreviewChange,
    openPerspectiveAfterUpload,
  };
}
