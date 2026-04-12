/**
 * Four guides in logical card space — one per edge (opposite edge is the view frame).
 * - `left` / `right`: vertical lines at x (from logical left)
 * - `top` / `bottom`: horizontal lines at y (from logical top)
 */
export type GuideLines = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type GuideKey = keyof GuideLines;

/** Fit-to-frame scale (CSS px per image px) and pan in screen pixels. */
export type ViewTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/** Point in source image natural pixel space. */
export type Point2 = { x: number; y: number };

/** Four corners: top-left, top-right, bottom-right, bottom-left (natural pixels). */
export type PerspectiveQuad = {
  tl: Point2;
  tr: Point2;
  br: Point2;
  bl: Point2;
};

export type CardSideState = {
  /** Original upload as a `data:` URL; never replaced by perspective warp. */
  rawImageSrc: string | null;
  /** Working image for centering: rectified `data:` PNG after warp, or same as `rawImageSrc` until then. */
  imageSrc: string | null;
  transform: ViewTransform;
  guides: GuideLines;
  /** Hex color for guide lines (native color input). */
  guideColor: string;
  /** Last applied quad in raw image space; used when re-opening perspective. */
  perspectiveCorners: PerspectiveQuad | null;
};

export type SideResult = {
  /** Same as inner-left guide x — margin from logical left. */
  leftMargin: number;
  /** Distance from inner-right guide to logical right edge. */
  rightMargin: number;
  /** Same as inner-top guide y — margin from logical top. */
  topMargin: number;
  /** Distance from inner-bottom guide to logical bottom edge. */
  bottomMargin: number;
  horizontalDisplay: string;
  verticalDisplay: string;
};

export type CardSide = "front" | "back";

/** Focus mode for one workspace (3× hides the other side). Only one side at a time. */
export type ViewerMagnifyFactor = 3;

export type ViewerMagnify = {
  side: CardSide;
  factor: ViewerMagnifyFactor;
};
