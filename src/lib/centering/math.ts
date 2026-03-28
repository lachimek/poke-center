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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Pairs stay ordered (a ≤ b); left pair stays left of right pair; top pair above bottom pair.
 */
export function clampGuides(
  guides: GuideLines,
  w = CARD_LOGICAL_WIDTH,
  h = CARD_LOGICAL_HEIGHT,
  gap = GUIDE_MIN_GAP,
): GuideLines {
  const cx = (v: number) => clamp(v, 0, w);
  const cy = (v: number) => clamp(v, 0, h);

  let left1 = cx(guides.left1);
  let left2 = cx(guides.left2);
  let right1 = cx(guides.right1);
  let right2 = cx(guides.right2);
  if (left1 > left2) {
    const t = left1;
    left1 = left2;
    left2 = t;
  }
  if (right1 > right2) {
    const t = right1;
    right1 = right2;
    right2 = t;
  }

  let top1 = cy(guides.top1);
  let top2 = cy(guides.top2);
  let bottom1 = cy(guides.bottom1);
  let bottom2 = cy(guides.bottom2);
  if (top1 > top2) {
    const t = top1;
    top1 = top2;
    top2 = t;
  }
  if (bottom1 > bottom2) {
    const t = bottom1;
    bottom1 = bottom2;
    bottom2 = t;
  }

  if (left2 > right1 - gap) {
    const m = (left2 + right1) / 2;
    left2 = cx(m - gap / 2);
    right1 = cx(m + gap / 2);
  }
  left1 = cx(Math.min(left1, left2 - gap));
  right2 = cx(Math.max(right2, right1 + gap));

  if (top2 > bottom1 - gap) {
    const m = (top2 + bottom1) / 2;
    top2 = cy(m - gap / 2);
    bottom1 = cy(m + gap / 2);
  }
  top1 = cy(Math.min(top1, top2 - gap));
  bottom2 = cy(Math.max(bottom2, bottom1 + gap));

  return {
    left1: cx(left1),
    left2: cx(left2),
    right1: cx(right1),
    right2: cx(right2),
    top1: cy(top1),
    top2: cy(top2),
    bottom1: cy(bottom1),
    bottom2: cy(bottom2),
  };
}

function mean(a: number, b: number): number {
  return (a + b) / 2;
}

/**
 * Effective inner reference per edge = mean of that edge’s two guides.
 * Horizontal ratio: leftRep vs (W - rightRep); vertical: topRep vs (H - bottomRep).
 */
export function computeSideResult(
  guides: GuideLines,
  w = CARD_LOGICAL_WIDTH,
  h = CARD_LOGICAL_HEIGHT,
): SideResult {
  const g = clampGuides(guides, w, h);
  const leftRep = mean(g.left1, g.left2);
  const rightRep = mean(g.right1, g.right2);
  const topRep = mean(g.top1, g.top2);
  const bottomRep = mean(g.bottom1, g.bottom2);

  const leftMargin = leftRep;
  const rightMargin = w - rightRep;
  const topMargin = topRep;
  const bottomMargin = h - bottomRep;

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
