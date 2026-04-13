import { CENTERING_SESSION_VERSION } from "@/lib/centering/sessionPayload";
import type { CardSideState, PerspectiveQuad } from "@/lib/centering/types";

export type CardSideConfiguration = Omit<
  CardSideState,
  "rawImageSrc" | "imageSrc"
>;

export type CenteringSessionConfiguration = {
  v: number;
  front: CardSideConfiguration;
  back: CardSideConfiguration;
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

export function isCardSideConfiguration(
  v: unknown,
): v is CardSideConfiguration {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
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

export function isCenteringSessionConfiguration(
  v: unknown,
): v is CenteringSessionConfiguration {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.v !== CENTERING_SESSION_VERSION) return false;
  return isCardSideConfiguration(o.front) && isCardSideConfiguration(o.back);
}
