import { useCallback, useEffect, useRef, useState } from "react";
import { reencodeImage } from "@/lib/capture/reencodeImage";
import type { CapturedSide, SideKey } from "@/lib/capture/types";
import { notifyError } from "@/lib/toast";

type CapturedSides = Record<SideKey, CapturedSide | null>;

const EMPTY_SIDES: CapturedSides = { front: null, back: null };

/**
 * State container for the two-sided mobile capture flow.
 *
 * Owns the lifecycle of each side's object URL so pickers, retakes, resets,
 * and unmounts all revoke cleanly. Re-encoding is awaited off the UI so
 * callers can show a per-side spinner via {@link processing}.
 */
export function useCapturedSides() {
  const [sides, setSides] = useState<CapturedSides>(EMPTY_SIDES);
  const [processing, setProcessing] = useState<SideKey | null>(null);

  const sidesRef = useRef(sides);
  sidesRef.current = sides;

  useEffect(() => {
    return () => {
      for (const side of Object.values(sidesRef.current)) {
        if (side) URL.revokeObjectURL(side.previewUrl);
      }
    };
  }, []);

  const setSide = useCallback((side: SideKey, next: CapturedSide | null) => {
    setSides((prev) => {
      const existing = prev[side];
      if (existing === next) return prev;
      if (existing) URL.revokeObjectURL(existing.previewUrl);
      return { ...prev, [side]: next };
    });
  }, []);

  const pick = useCallback(
    async (side: SideKey, file: File) => {
      setProcessing(side);
      try {
        const captured = await reencodeImage(file);
        setSide(side, captured);
      } catch {
        notifyError("Could not process that photo. Please try again.");
      } finally {
        setProcessing(null);
      }
    },
    [setSide],
  );

  const retake = useCallback(
    (side: SideKey) => {
      setSide(side, null);
    },
    [setSide],
  );

  const reset = useCallback(() => {
    setSides((prev) => {
      for (const side of Object.values(prev)) {
        if (side) URL.revokeObjectURL(side.previewUrl);
      }
      return EMPTY_SIDES;
    });
  }, []);

  return { sides, processing, pick, retake, reset };
}
