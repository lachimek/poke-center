"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { computeSideResult } from "@/lib/centering/math";
import {
  CENTERING_SESSION_VERSION,
  clearCenteringSession,
  loadCenteringSession,
  saveCenteringSession,
} from "@/lib/centering/sessionDb";
import type {
  CardSide,
  ViewerMagnify,
  ViewerMagnifyFactor,
} from "@/lib/centering/types";
import { useCenteringStore } from "@/stores/centeringStore";
import { CardWorkspace } from "./CardWorkspace";
import { SummaryPanel } from "./SummaryPanel";

export function CenteringApp() {
  const front = useCenteringStore((s) => s.front);
  const back = useCenteringStore((s) => s.back);
  const resetAll = useCenteringStore((s) => s.resetAll);
  const hydrateFromSession = useCenteringStore((s) => s.hydrateFromSession);

  const [viewerMagnify, setViewerMagnify] = useState<ViewerMagnify | null>(
    null,
  );
  const [perspectiveOpen, setPerspectiveOpen] = useState({
    front: false,
    back: false,
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadCenteringSession().then((payload) => {
      if (cancelled || !payload) return;
      hydrateFromSession(payload.front, payload.back);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateFromSession]);

  const setPerspectiveForSide = useCallback((side: CardSide, open: boolean) => {
    setPerspectiveOpen((p) => (p[side] === open ? p : { ...p, [side]: open }));
  }, []);

  const frontResult = useMemo(
    () => computeSideResult(front.guides),
    [front.guides],
  );
  const backResult = useMemo(
    () => computeSideResult(back.guides),
    [back.guides],
  );

  const canSave =
    !!front.imageSrc &&
    !!back.imageSrc &&
    !perspectiveOpen.front &&
    !perspectiveOpen.back;

  const onSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const { front: f, back: b } = useCenteringStore.getState();
      await saveCenteringSession({
        v: CENTERING_SESSION_VERSION,
        front: f,
        back: b,
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onResetAll = async () => {
    setViewerMagnify(null);
    setSaveError(null);
    resetAll();
    try {
      await clearCenteringSession();
    } catch {
      // storage may be blocked; in-memory state is already cleared
    }
  };

  const col1 =
    viewerMagnify?.side === "front" ? `${viewerMagnify.factor}fr` : "1fr";
  const col2 =
    viewerMagnify?.side === "back" ? `${viewerMagnify.factor}fr` : "1fr";

  const setMagnifyForSide = (
    side: CardSide,
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
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={!canSave || saving}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              title={
                !front.imageSrc || !back.imageSrc
                  ? "Upload both sides first"
                  : perspectiveOpen.front || perspectiveOpen.back
                    ? "Close perspective editor first"
                    : undefined
              }
            >
              {saving ? "Saving…" : "Save session"}
            </button>
            <button
              type="button"
              onClick={() => void onResetAll()}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80"
            >
              Reset
            </button>
          </div>
          {saveError ? (
            <p className="text-right text-xs text-red-400" role="alert">
              {saveError}
            </p>
          ) : null}
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
          title="FRONT"
          sideLabel="Side A"
          side="front"
          viewerMagnify={viewerMagnify}
          onViewerMagnify={(factor) => setMagnifyForSide("front", factor)}
          sideResult={frontResult}
          onPerspectiveModeChange={(open) =>
            setPerspectiveForSide("front", open)
          }
        />
        <CardWorkspace
          title="BACK"
          sideLabel="Side B"
          side="back"
          viewerMagnify={viewerMagnify}
          onViewerMagnify={(factor) => setMagnifyForSide("back", factor)}
          sideResult={backResult}
          onPerspectiveModeChange={(open) =>
            setPerspectiveForSide("back", open)
          }
        />
        <SummaryPanel front={frontResult} back={backResult} />
      </div>
    </>
  );
}
