"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_GUIDE_COLOR,
  DEFAULT_GUIDES,
  DEFAULT_VIEW_TRANSFORM,
} from "@/lib/centering/constants";
import { renderCenteringExportPng } from "@/lib/centering/exportCompositeImage";
import { summarizeCenteringByCompany } from "@/lib/centering/gradeEstimate";
import { computeSideResult } from "@/lib/centering/math";
import {
  clearCenteringSession,
  loadCenteringSession,
  saveCenteringSession,
} from "@/lib/centering/sessionDb";
import { CENTERING_SESSION_VERSION } from "@/lib/centering/sessionPayload";
import type {
  CardSide,
  CardSideState,
  ViewerMagnify,
  ViewerMagnifyFactor,
} from "@/lib/centering/types";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  notifyWarning,
} from "@/lib/toast";
import { useCenteringStore } from "@/stores/centeringStore";
import { CardWorkspace } from "./CardWorkspace";
import { CenteringAppHeader } from "./CenteringAppHeader";
import { ExportPreviewModal } from "./ExportPreviewModal";
import { SaveCardToAccountModal } from "./SaveCardToAccountModal";
import { SummaryPanel } from "./SummaryPanel";

type WipCardResponse =
  | {
      ok: true;
      card: {
        id: string;
        name: string;
        createdAt: string;
        frontRawUrl: string | null;
        frontRawMimeType: string | null;
        backRawUrl: string | null;
        backRawMimeType: string | null;
      };
    }
  | { ok: false; error: string };

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load image.");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("Expected data URL"));
        return;
      }
      resolve(r);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}

function sideStateFromDataUrl(dataUrl: string): CardSideState {
  return {
    rawImageSrc: dataUrl,
    imageSrc: dataUrl,
    transform: { ...DEFAULT_VIEW_TRANSFORM },
    guides: { ...DEFAULT_GUIDES },
    guideColor: DEFAULT_GUIDE_COLOR,
    perspectiveCorners: null,
  };
}

export function CenteringApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wipParam = searchParams.get("wip");

  const front = useCenteringStore((s) => s.front);
  const back = useCenteringStore((s) => s.back);
  const resetAll = useCenteringStore((s) => s.resetAll);
  const hydrateFromSession = useCenteringStore((s) => s.hydrateFromSession);

  const [wipId, setWipId] = useState<string | null>(null);
  const [wipName, setWipName] = useState<string | null>(null);
  const [wipLoading, setWipLoading] = useState(false);
  const finalizedWipRef = useRef<string | null>(null);
  const [openPerspectiveSignal, setOpenPerspectiveSignal] = useState<{
    side: CardSide;
    token: number;
  } | null>(null);

  const [viewerMagnify, setViewerMagnify] = useState<ViewerMagnify | null>(
    null,
  );
  const [perspectiveOpen, setPerspectiveOpen] = useState({
    front: false,
    back: false,
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportPreview, setExportPreview] = useState<{
    previewUrl: string;
    filename: string;
    blob: Blob;
  } | null>(null);
  const [saveToAccountOpen, setSaveToAccountOpen] = useState(false);

  const closeExportPreview = useCallback(() => {
    setExportPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  useEffect(() => {
    if (wipParam) return;
    let cancelled = false;
    void loadCenteringSession().then((payload) => {
      if (cancelled || !payload) return;
      hydrateFromSession(payload.front, payload.back);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateFromSession, wipParam]);

  useEffect(() => {
    if (!wipParam) {
      setWipId(null);
      setWipName(null);
      return;
    }
    if (wipParam === wipId) return;
    // Skip fetching a WIP card we just finalized — it was deleted server-side,
    // and the stale `wipParam` in the URL would otherwise surface a 404 toast
    // on the way out to /protected/cards.
    if (finalizedWipRef.current === wipParam) return;

    let cancelled = false;
    setWipLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/wip-cards/${encodeURIComponent(wipParam)}`,
        );
        const json = (await res.json()) as WipCardResponse;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          notifyError(
            json.ok
              ? "Could not load WIP card."
              : json.error || "Could not load WIP card.",
          );
          return;
        }
        if (!json.card.frontRawUrl || !json.card.backRawUrl) {
          notifyError("WIP card is missing one or both images.");
          return;
        }
        const [frontDataUrl, backDataUrl] = await Promise.all([
          fetchAsDataUrl(json.card.frontRawUrl),
          fetchAsDataUrl(json.card.backRawUrl),
        ]);
        if (cancelled) return;
        hydrateFromSession(
          sideStateFromDataUrl(frontDataUrl),
          sideStateFromDataUrl(backDataUrl),
        );
        setWipId(json.card.id);
        setWipName(json.card.name);
        setOpenPerspectiveSignal({ side: "front", token: Date.now() });
        notifySuccess(`Loaded "${json.card.name}" from WIP.`);
      } catch {
        if (!cancelled) notifyError("Could not load WIP card.");
      } finally {
        if (!cancelled) setWipLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wipParam, wipId, hydrateFromSession]);

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
    setSaving(true);
    try {
      const { front: f, back: b } = useCenteringStore.getState();
      await saveCenteringSession({
        v: CENTERING_SESSION_VERSION,
        front: f,
        back: b,
      });
      notifySuccess("Session saved to this browser.");
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onExport = async () => {
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
      notifySuccess("Export preview is ready.");
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const onResetAll = async () => {
    setViewerMagnify(null);
    closeExportPreview();
    resetAll();
    setWipId(null);
    setWipName(null);
    if (wipParam) {
      router.replace("/");
    }
    try {
      await clearCenteringSession();
      notifyInfo("Workspace reset and local session cleared.");
    } catch {
      // storage may be blocked; in-memory state is already cleared
      notifyWarning("Workspace reset, but local session could not be cleared.");
    }
  };

  const onWipFinalized = useCallback(() => {
    if (wipId) finalizedWipRef.current = wipId;
    setWipId(null);
    setWipName(null);
    setOpenPerspectiveSignal(null);
    resetAll();
    void clearCenteringSession().catch(() => {});
    router.replace("/protected/cards");
  }, [resetAll, router, wipId]);

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

      {saveToAccountOpen ? (
        <SaveCardToAccountModal
          onClose={() => setSaveToAccountOpen(false)}
          payload={{
            v: CENTERING_SESSION_VERSION,
            front,
            back,
          }}
          wipId={wipId}
          defaultName={wipName ?? undefined}
          onSaved={onWipFinalized}
        />
      ) : null}

      <CenteringAppHeader
        onSave={onSave}
        canSave={canSave}
        saving={saving}
        persistActionsTitle={persistActionsTitle}
        onOpenSaveToAccount={() => setSaveToAccountOpen(true)}
        onExport={onExport}
        exporting={exporting}
        onResetAll={onResetAll}
      />

      {wipLoading || wipName ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sky-500/20 bg-sky-500/10 px-5 py-3 text-sm text-sky-100">
          <span>
            {wipLoading
              ? "Loading work-in-progress card…"
              : `Centering work-in-progress card: "${wipName}".`}
          </span>
          {wipName && !wipLoading ? (
            <span className="text-xs text-sky-200/80">
              Saving to your account will consume this WIP entry.
            </span>
          ) : null}
        </div>
      ) : null}

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
            openPerspectiveToken={
              openPerspectiveSignal?.side === "front"
                ? openPerspectiveSignal.token
                : null
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
            openPerspectiveToken={
              openPerspectiveSignal?.side === "back"
                ? openPerspectiveSignal.token
                : null
            }
          />
        </div>
        <SummaryPanel front={frontResult} back={backResult} />
      </div>
    </>
  );
}
