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
  rawImageSrc: null,
  imageSrc: null,
  transform: { ...DEFAULT_VIEW_TRANSFORM },
  guides: { ...DEFAULT_GUIDES },
  guideColor: DEFAULT_GUIDE_COLOR,
  perspectiveCorners: null,
};

export function CenteringApp() {
  const [front, setFront] = useState<CardSideState>(initialSide);
  const [back, setBack] = useState<CardSideState>(initialSide);
  const [viewerMagnify, setViewerMagnify] = useState<ViewerMagnify | null>(
    null,
  );

  useEffect(() => {
    return () => {
      const urls = new Set<string>();
      for (const u of [
        front.rawImageSrc,
        front.imageSrc,
        back.rawImageSrc,
        back.imageSrc,
      ]) {
        if (u) urls.add(u);
      }
      for (const u of urls) {
        URL.revokeObjectURL(u);
      }
    };
  }, [front.rawImageSrc, front.imageSrc, back.rawImageSrc, back.imageSrc]);

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
      if (s.rawImageSrc) URL.revokeObjectURL(s.rawImageSrc);
      if (s.imageSrc && s.imageSrc !== s.rawImageSrc) {
        URL.revokeObjectURL(s.imageSrc);
      }
      return { ...initialSide };
    });
    setBack((s) => {
      if (s.rawImageSrc) URL.revokeObjectURL(s.rawImageSrc);
      if (s.imageSrc && s.imageSrc !== s.rawImageSrc) {
        URL.revokeObjectURL(s.imageSrc);
      }
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
    <>
      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/80 px-5 py-5 shadow-2xl shadow-black/20 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <div className="h-5 w-5 rounded-md border border-emerald-400/70" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              Manual centering analyzer
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              PokéCentering
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Local only · logical space 630×880 · 63:88
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80"
          >
            Reset
          </button>
          <button
            type="button"
            disabled
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300/80 opacity-60"
            title="Coming later"
          >
            Export result
          </button>
        </div>
      </header>

      <div
        className="grid grid-cols-1 gap-6 lg:gap-6 xl:items-start xl:[grid-template-columns:var(--pc-col-1)_var(--pc-col-2)_minmax(280px,360px)]"
        style={
          {
            "--pc-col-1": col1,
            "--pc-col-2": col2,
          } as CSSProperties
        }
      >
        <CardWorkspace
          title="Front"
          sideLabel="Side A"
          helper="63:88 locked · 8 guides"
          side="front"
          viewerMagnify={viewerMagnify}
          onViewerMagnify={(factor) => setMagnifyForSide("front", factor)}
          sideResult={frontResult}
          state={front}
          setState={setFront}
        />
        <CardWorkspace
          title="Back"
          sideLabel="Side B"
          helper="Independent guides"
          side="back"
          viewerMagnify={viewerMagnify}
          onViewerMagnify={(factor) => setMagnifyForSide("back", factor)}
          sideResult={backResult}
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
    </>
  );
}
