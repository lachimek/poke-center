"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_GUIDE_COLOR,
  DEFAULT_GUIDES,
  DEFAULT_VIEW_TRANSFORM,
} from "@/lib/centering/constants";
import { computeSideResult } from "@/lib/centering/math";
import type {
  CardSideState,
  ViewerMagnify,
  ViewerMagnifyFactor,
} from "@/lib/centering/types";
import { CardWorkspace } from "./CardWorkspace";
import { SummaryPanel } from "./SummaryPanel";

const initialSide: CardSideState = {
  imageSrc: null,
  transform: { ...DEFAULT_VIEW_TRANSFORM },
  guides: { ...DEFAULT_GUIDES },
  guideColor: DEFAULT_GUIDE_COLOR,
};

export function CenteringApp() {
  const [front, setFront] = useState<CardSideState>(initialSide);
  const [back, setBack] = useState<CardSideState>(initialSide);
  const [viewerMagnify, setViewerMagnify] = useState<ViewerMagnify | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (front.imageSrc) URL.revokeObjectURL(front.imageSrc);
      if (back.imageSrc) URL.revokeObjectURL(back.imageSrc);
    };
  }, [front.imageSrc, back.imageSrc]);

  const frontResult = useMemo(
    () => computeSideResult(front.guides),
    [front.guides],
  );
  const backResult = useMemo(
    () => computeSideResult(back.guides),
    [back.guides],
  );

  const onResetGuidesAll = () => {
    setFront((s) => ({ ...s, guides: { ...DEFAULT_GUIDES } }));
    setBack((s) => ({ ...s, guides: { ...DEFAULT_GUIDES } }));
  };

  const onResetAll = () => {
    setViewerMagnify(null);
    setFront((s) => {
      if (s.imageSrc) URL.revokeObjectURL(s.imageSrc);
      return { ...initialSide };
    });
    setBack((s) => {
      if (s.imageSrc) URL.revokeObjectURL(s.imageSrc);
      return { ...initialSide };
    });
  };

  const col1 =
    viewerMagnify?.side === "front" ? `${viewerMagnify.factor}fr` : "1fr";
  const col2 =
    viewerMagnify?.side === "back" ? `${viewerMagnify.factor}fr` : "1fr";

  const setMagnifyForSide = (
    side: "front" | "back",
    factor: ViewerMagnifyFactor | null,
  ) => {
    if (factor === null) {
      setViewerMagnify(null);
      return;
    }
    setViewerMagnify({ side, factor });
  };

  return (
    <div
      className="grid grid-cols-1 gap-8 xl:items-start xl:[grid-template-columns:var(--pc-col-1)_var(--pc-col-2)_minmax(260px,320px)]"
      style={
        {
          "--pc-col-1": col1,
          "--pc-col-2": col2,
        } as CSSProperties
      }
    >
      <CardWorkspace
        title="Front"
        helper="63:88 · 8 guides (2/edge)"
        side="front"
        viewerMagnify={viewerMagnify}
        onViewerMagnify={(factor) => setMagnifyForSide("front", factor)}
        state={front}
        setState={setFront}
      />
      <CardWorkspace
        title="Back"
        helper="63:88 · own 8 guides"
        side="back"
        viewerMagnify={viewerMagnify}
        onViewerMagnify={(factor) => setMagnifyForSide("back", factor)}
        state={back}
        setState={setBack}
      />
      <SummaryPanel
        front={frontResult}
        back={backResult}
        frontGuides={front.guides}
        backGuides={back.guides}
        onResetGuidesAll={onResetGuidesAll}
        onResetAll={onResetAll}
      />
    </div>
  );
}
