import type { CardSideState, PerspectiveQuad } from "@/lib/centering/types";

export const CENTERING_SESSION_VERSION = 1;

export type CenteringSessionPayload = {
  v: number;
  front: CardSideState;
  back: CardSideState;
};

function isPoint2(v: unknown): v is { x: number; y: number } {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.x === "number" &&
    Number.isFinite(o.x) &&
    typeof o.y === "number" &&
    Number.isFinite(o.y)
  );
}

function isPerspectiveQuad(v: unknown): v is PerspectiveQuad {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return isPoint2(o.tl) && isPoint2(o.tr) && isPoint2(o.br) && isPoint2(o.bl);
}

function isDataUrlOrNull(s: unknown): s is string | null {
  if (s === null) return true;
  return typeof s === "string" && s.startsWith("data:");
}

export function isCardSideState(v: unknown): v is CardSideState {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!isDataUrlOrNull(o.rawImageSrc) || !isDataUrlOrNull(o.imageSrc)) {
    return false;
  }
  const t = o.transform;
  if (typeof t !== "object" || t === null) return false;
  const tr = t as Record<string, unknown>;
  if (
    typeof tr.scale !== "number" ||
    !Number.isFinite(tr.scale) ||
    typeof tr.offsetX !== "number" ||
    !Number.isFinite(tr.offsetX) ||
    typeof tr.offsetY !== "number" ||
    !Number.isFinite(tr.offsetY)
  ) {
    return false;
  }
  const g = o.guides;
  if (typeof g !== "object" || g === null) return false;
  const gr = g as Record<string, unknown>;
  if (
    typeof gr.left !== "number" ||
    typeof gr.right !== "number" ||
    typeof gr.top !== "number" ||
    typeof gr.bottom !== "number"
  ) {
    return false;
  }
  if (typeof o.guideColor !== "string") return false;
  if (
    o.perspectiveCorners !== null &&
    !isPerspectiveQuad(o.perspectiveCorners)
  ) {
    return false;
  }
  return true;
}

export function isSessionPayload(v: unknown): v is CenteringSessionPayload {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.v !== CENTERING_SESSION_VERSION) return false;
  return isCardSideState(o.front) && isCardSideState(o.back);
}

function isNonNullDataUrl(s: unknown): s is string {
  return typeof s === "string" && s.length > 0 && s.startsWith("data:");
}

/** Saved-card rows require all four images as non-null `data:` URLs. */
export function isAccountSavePayload(v: unknown): v is CenteringSessionPayload {
  if (!isSessionPayload(v)) return false;
  const { front: f, back: b } = v;
  return (
    isNonNullDataUrl(f.rawImageSrc) &&
    isNonNullDataUrl(f.imageSrc) &&
    isNonNullDataUrl(b.rawImageSrc) &&
    isNonNullDataUrl(b.imageSrc)
  );
}
