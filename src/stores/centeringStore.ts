import { create } from "zustand";
import {
  DEFAULT_GUIDE_COLOR,
  DEFAULT_GUIDES,
  DEFAULT_VIEW_TRANSFORM,
} from "@/lib/centering/constants";
import type { CardSide, CardSideState } from "@/lib/centering/types";

export function createInitialSide(): CardSideState {
  return {
    rawImageSrc: null,
    imageSrc: null,
    transform: { ...DEFAULT_VIEW_TRANSFORM },
    guides: { ...DEFAULT_GUIDES },
    guideColor: DEFAULT_GUIDE_COLOR,
    perspectiveCorners: null,
  };
}

type CenteringStore = {
  front: CardSideState;
  back: CardSideState;
  setSide: (
    side: CardSide,
    update: CardSideState | ((prev: CardSideState) => CardSideState),
  ) => void;
  resetAll: () => void;
  hydrateFromSession: (front: CardSideState, back: CardSideState) => void;
};

export const useCenteringStore = create<CenteringStore>((set) => ({
  front: createInitialSide(),
  back: createInitialSide(),
  setSide: (side, update) =>
    set((state) => {
      const prev = state[side];
      const next =
        typeof update === "function"
          ? (update as (p: CardSideState) => CardSideState)(prev)
          : update;
      return { [side]: next };
    }),
  resetAll: () =>
    set({ front: createInitialSide(), back: createInitialSide() }),
  hydrateFromSession: (front, back) => set({ front, back }),
}));
