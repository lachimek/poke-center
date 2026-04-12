/** Logical card dimensions (Pokémon card ratio 63:88). All guide math uses this space. */
export const CARD_LOGICAL_WIDTH = 630;
export const CARD_LOGICAL_HEIGHT = 880;

export const CARD_ASPECT_RATIO = 63 / 88;

/** Minimum gap between left and right guides (and top / bottom) in logical units. */
export const GUIDE_MIN_GAP = 8;

const w = CARD_LOGICAL_WIDTH;
const h = CARD_LOGICAL_HEIGHT;

/** One movable line per side; opposite side of the frame is the view edge. */
export const DEFAULT_GUIDES = {
  left: Math.round(w * 0.09),
  right: Math.round(w * 0.91),
  top: Math.round(h * 0.09),
  bottom: Math.round(h * 0.91),
} as const;

export const DEFAULT_VIEW_TRANSFORM = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
} as const;

export const DEFAULT_GUIDE_COLOR = "#ff0000";
