/** Logical card dimensions (Pokémon card ratio 63:88). All guide math uses this space. */
export const CARD_LOGICAL_WIDTH = 630;
export const CARD_LOGICAL_HEIGHT = 880;

export const CARD_ASPECT_RATIO = 63 / 88;

/** Minimum gap between left pair / right pair (and top / bottom) in logical units. */
export const GUIDE_MIN_GAP = 8;

const w = CARD_LOGICAL_WIDTH;
const h = CARD_LOGICAL_HEIGHT;

/**
 * Eight guides: two verticals per horizontal margin (left / right), two horizontals per vertical margin (top / bottom).
 * Not a single inner rectangle — each edge is bracketed by a pair.
 */
export const DEFAULT_GUIDES = {
  left1: Math.round(w * 0.07),
  left2: Math.round(w * 0.11),
  right1: Math.round(w * 0.89),
  right2: Math.round(w * 0.93),
  top1: Math.round(h * 0.07),
  top2: Math.round(h * 0.11),
  bottom1: Math.round(h * 0.89),
  bottom2: Math.round(h * 0.93),
} as const;

export const DEFAULT_VIEW_TRANSFORM = {
  scale: 1,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
} as const;

export const DEFAULT_GUIDE_COLOR = "#d4af37";

/** View zoom limits (display scale vs intrinsic pixels). */
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 8;

/** Wheel zoom multiplier per notch (closer to 1 = finer). */
export const WHEEL_ZOOM_STEP = 1.005;

/** Range input step for zoom slider. */
export const ZOOM_SLIDER_STEP = 0.001;

/** Rotation slider step (degrees). */
export const ROTATION_SLIDER_STEP = 0.1;
