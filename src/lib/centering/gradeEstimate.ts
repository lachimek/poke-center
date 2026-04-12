import { sideMeetsMinLoBothAxes } from "./math";
import type { SideResult } from "./types";

export type CompanyCenteringSummary = {
  company: string;
  /** Highest listed tier whose centering thresholds pass; null if none. */
  bestTier: string | null;
  /** True if at least one listed tier for this company passes. */
  qualifies: boolean;
};

function bothFaces(
  front: SideResult,
  back: SideResult,
  fMin: number,
  bMin: number,
): boolean {
  return (
    sideMeetsMinLoBothAxes(front, fMin) && sideMeetsMinLoBothAxes(back, bMin)
  );
}

/**
 * Best-effort **centering-only** tier per grading company (public ratio rules).
 * Both horizontal and vertical axes must meet each face’s min “lo” % (same rounding as UI).
 */
export function summarizeCenteringByCompany(
  front: SideResult,
  back: SideResult,
): CompanyCenteringSummary[] {
  const psa10 = bothFaces(front, back, 45, 25);

  const bgsBlack = bothFaces(front, back, 50, 50);
  const bgsPristine = bothFaces(front, back, 45, 45);
  const bgs95 = bothFaces(front, back, 45, 40);

  const cgcPristine = bothFaces(front, back, 45, 45);
  const cgcGemNew = bothFaces(front, back, 40, 40);
  const cgc95 = bothFaces(front, back, 45, 40);

  const ace10 = bothFaces(front, back, 40, 40);

  let bgsTier: string | null = null;
  if (bgsBlack) bgsTier = "10 Black Label";
  else if (bgsPristine) bgsTier = "10 Pristine (Gold)";
  else if (bgs95) bgsTier = "9.5 Gem Mint";

  let cgcTier: string | null = null;
  if (cgcPristine) cgcTier = "10 Pristine";
  else if (cgcGemNew) cgcTier = "10 Gem Mint (new)";
  else if (cgc95) cgcTier = "9.5 Gem Mint";

  return [
    {
      company: "PSA",
      bestTier: psa10 ? "10 Gem Mint" : null,
      qualifies: psa10,
    },
    {
      company: "BGS",
      bestTier: bgsTier,
      qualifies: bgsTier !== null,
    },
    {
      company: "CGC",
      bestTier: cgcTier,
      qualifies: cgcTier !== null,
    },
    {
      company: "ACE",
      bestTier: ace10 ? "10" : null,
      qualifies: ace10,
    },
  ];
}
