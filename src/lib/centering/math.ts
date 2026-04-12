import {
  CARD_LOGICAL_HEIGHT,
  CARD_LOGICAL_WIDTH,
  GUIDE_MIN_GAP,
} from "./constants";
import type { GuideLines, SideResult } from "./types";

/**
 * Formats two complementary fractions (summing to ~100%) as "smaller / larger" percents.
 */
export function formatRatioPair(shareA: number, _shareB: number): string {
  const pctA = Math.round(shareA * 100);
  const pctB = 100 - pctA;
  const lo = Math.min(pctA, pctB);
  const hi = Math.max(pctA, pctB);
  return `${lo} / ${hi}`;
}

/**
 * Smaller of the two rounded complementary percents — the first number in "45 / 55".
 */
export function smallerMarginPercentFromShare(shareA: number): number {
  const pctA = Math.round(shareA * 100);
  const pctB = 100 - pctA;
  return Math.min(pctA, pctB);
}

/** Horizontal and vertical "lo" percents for a card face (both axes must pass grade rules). */
export function sideAxisLoPercents(result: SideResult): {
  hLo: number;
  vLo: number;
} {
  const hDenom = result.leftMargin + result.rightMargin;
  const vDenom = result.topMargin + result.bottomMargin;
  const leftPct = hDenom > 0 ? result.leftMargin / hDenom : 0.5;
  const topPct = vDenom > 0 ? result.topMargin / vDenom : 0.5;
  return {
    hLo: smallerMarginPercentFromShare(leftPct),
    vLo: smallerMarginPercentFromShare(topPct),
  };
}

/** True if both horizontal and vertical centering meet min lo% (vs 50/50). */
export function sideMeetsMinLoBothAxes(
  result: SideResult,
  minLo: number,
): boolean {
  const { hLo, vLo } = sideAxisLoPercents(result);
  return hLo >= minLo && vLo >= minLo;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Clamp a lo/hi pair so they stay within [0, maxDim] with at least `gap` between them. */
function clampAxisPair(
  lo: number,
  hi: number,
  gap: number,
  maxDim: number,
): [number, number] {
  let a = clamp(lo, 0, maxDim);
  let b = clamp(hi, 0, maxDim);
  if (b - a < gap) {
    const mid = (a + b) * 0.5;
    a = mid - gap * 0.5;
    b = mid + gap * 0.5;
  }
  a = clamp(a, 0, maxDim - gap);
  b = clamp(b, gap, maxDim);
  if (b < a + gap) {
    b = a + gap;
  }
  if (b > maxDim) {
    b = maxDim;
    a = maxDim - gap;
  }
  if (a < 0) {
    a = 0;
    b = gap;
  }
  return [a, b];
}

/**
 * Keeps left < right and top < bottom with at least `gap`, clamped to the logical card.
 */
export function clampGuides(
  guides: GuideLines,
  w = CARD_LOGICAL_WIDTH,
  h = CARD_LOGICAL_HEIGHT,
  gap = GUIDE_MIN_GAP,
): GuideLines {
  const [left, right] = clampAxisPair(guides.left, guides.right, gap, w);
  const [top, bottom] = clampAxisPair(guides.top, guides.bottom, gap, h);
  return { left, right, top, bottom };
}

/**
 * Margins: inner guides vs opposite frame edges (logical width/height).
 */
export function computeSideResult(
  guides: GuideLines,
  w = CARD_LOGICAL_WIDTH,
  h = CARD_LOGICAL_HEIGHT,
): SideResult {
  const g = clampGuides(guides, w, h);

  const leftMargin = g.left;
  const rightMargin = w - g.right;
  const topMargin = g.top;
  const bottomMargin = h - g.bottom;

  const hDenom = leftMargin + rightMargin;
  const vDenom = topMargin + bottomMargin;

  const leftPct = hDenom > 0 ? leftMargin / hDenom : 0.5;
  const rightPct = hDenom > 0 ? rightMargin / hDenom : 0.5;
  const topPct = vDenom > 0 ? topMargin / vDenom : 0.5;
  const bottomPct = vDenom > 0 ? bottomMargin / vDenom : 0.5;

  return {
    leftMargin,
    rightMargin,
    topMargin,
    bottomMargin,
    horizontalDisplay: formatRatioPair(leftPct, rightPct),
    verticalDisplay: formatRatioPair(topPct, bottomPct),
  };
}

/** Outline color for guide strokes from a hex color (e.g. #d4af37). */
export function guideStrokeColors(hex: string): { main: string; dim: string } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) {
    return {
      main: "rgba(212, 175, 55, 0.95)",
      dim: "rgba(212, 175, 55, 0.45)",
    };
  }
  const n = Number.parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return {
    main: `rgba(${r}, ${g}, ${b}, 0.95)`,
    dim: `rgba(${r}, ${g}, ${b}, 0.45)`,
  };
}
