"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { renderCenteringExportPng } from "@/lib/centering/exportCompositeImage";
import { summarizeCenteringByCompany } from "@/lib/centering/gradeEstimate";
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
import { ExportPreviewModal } from "./ExportPreviewModal";
import { SummaryPanel } from "./SummaryPanel";
import { CenteringAppHeader } from "./CenteringAppHeader";

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
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportPreview, setExportPreview] = useState<{
    previewUrl: string;
    filename: string;
    blob: Blob;
  } | null>(null);

  const closeExportPreview = useCallback(() => {
    setExportPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

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

  const persistActionsTitle =
    !front.imageSrc || !back.imageSrc
      ? "Upload both sides first"
      : perspectiveOpen.front || perspectiveOpen.back
        ? "Close perspective editor first"
        : undefined;

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

  const onExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      const { front: f, back: b } = useCenteringStore.getState();
      const fr = computeSideResult(f.guides);
      const br = computeSideResult(b.guides);
      const blob = await renderCenteringExportPng({
        front: f,
        back: b,
        frontResult: fr,
        backResult: br,
        gradeSummary: summarizeCenteringByCompany(fr, br),
      });
      const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
      const filename = `poke-centering-${stamp}.png`;
      const previewUrl = URL.createObjectURL(blob);
      setExportPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        return { previewUrl, filename, blob };
      });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const onResetAll = async () => {
    setViewerMagnify(null);
    setSaveError(null);
    setExportError(null);
    closeExportPreview();
    resetAll();
    try {
      await clearCenteringSession();
    } catch {
      // storage may be blocked; in-memory state is already cleared
    }
  };

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
      {exportPreview ? (
        <ExportPreviewModal
          previewUrl={exportPreview.previewUrl}
          filename={exportPreview.filename}
          blob={exportPreview.blob}
          onClose={closeExportPreview}
        />
      ) : null}

      <CenteringAppHeader
        onSave={onSave}
        canSave={canSave}
        saving={saving}
        persistActionsTitle={persistActionsTitle}
        onExport={onExport}
        exporting={exporting}
        exportError={exportError}
        saveError={saveError}
        onResetAll={onResetAll}
      />

      <div
        className={`grid grid-cols-1 gap-6 lg:gap-6 xl:items-start ${
          viewerMagnify
            ? "xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]"
            : "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,360px)]"
        }`}
      >
        <div
          className={`min-w-0 ${viewerMagnify?.side === "back" ? "hidden" : ""}`}
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
        </div>
        <div
          className={`min-w-0 ${viewerMagnify?.side === "front" ? "hidden" : ""}`}
        >
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
        </div>
        <SummaryPanel front={frontResult} back={backResult} />
      </div>
    </>
  );
}
