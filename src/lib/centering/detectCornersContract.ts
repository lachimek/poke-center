import type { PerspectiveQuad } from "@/lib/centering/types";

export const DETECT_CORNERS_MAX_BYTES = 12 * 1024 * 1024;

export type DetectCornersSuccess = {
  ok: true;
  quad: PerspectiveQuad;
  meta: {
    confidence: number;
    width: number;
    height: number;
  };
};

export type DetectCornersError = {
  ok: false;
  error: string;
};

export type DetectCornersResponse = DetectCornersSuccess | DetectCornersError;
