/**
 * Eight guides in logical card space — two per edge:
 * - Left margin: vertical lines at left1, left2 (x)
 * - Right margin: vertical lines at right1, right2 (x)
 * - Top margin: horizontal lines at top1, top2 (y)
 * - Bottom margin: horizontal lines at bottom1, bottom2 (y)
 *
 * Ratios use the mean of each pair (not a shared inner bounding box).
 */
export type GuideLines = {
  left1: number;
  left2: number;
  right1: number;
  right2: number;
  top1: number;
  top2: number;
  bottom1: number;
  bottom2: number;
};

export type GuideKey = keyof GuideLines;

export type ViewTransform = {
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
};

export type CardSideState = {
  imageSrc: string | null;
  transform: ViewTransform;
  guides: GuideLines;
  /** Hex color for guide lines (native color input). */
  guideColor: string;
};

export type SideResult = {
  /** Mean(left1, left2) — used for horizontal ratio. */
  leftMargin: number;
  /** W - mean(right1, right2). */
  rightMargin: number;
  /** Mean(top1, top2). */
  topMargin: number;
  /** H - mean(bottom1, bottom2). */
  bottomMargin: number;
  horizontalDisplay: string;
  verticalDisplay: string;
};

export type CardSide = "front" | "back";

/** Widen one workspace column (2× or 3× vs the other). Only one side at a time. */
export type ViewerMagnifyFactor = 2 | 3;

export type ViewerMagnify = {
  side: CardSide;
  factor: ViewerMagnifyFactor;
};
