import { useCallback, useState } from "react";
import type { CapturedSide } from "@/lib/capture/types";
import {
  submitWipCard,
  WipSubmitError,
  type WipSubmitStep,
} from "@/lib/capture/wipCardClient";
import { notifyError } from "@/lib/toast";

type UseWipCardSubmitParams = {
  onSuccess?: (result: { id: string; name: string }) => void;
};

type SubmitInput = {
  name: string;
  front: CapturedSide | null;
  back: CapturedSide | null;
};

/**
 * Thin stateful wrapper around {@link submitWipCard} that surfaces the
 * current step, toasts errors, and guards against duplicate submits.
 */
export function useWipCardSubmit({ onSuccess }: UseWipCardSubmitParams = {}) {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<WipSubmitStep | null>(null);

  const submit = useCallback(
    async ({ name, front, back }: SubmitInput) => {
      if (submitting) return false;
      if (!front || !back) return false;
      const trimmed = name.trim();
      if (!trimmed) return false;

      setSubmitting(true);
      setStep("create");
      try {
        const result = await submitWipCard(
          { name: trimmed, front, back },
          (next) => setStep(next),
        );
        onSuccess?.({ id: result.id, name: trimmed });
        return true;
      } catch (error) {
        if (error instanceof WipSubmitError) {
          console.error(
            `Capture submit failed at step="${error.step}"`,
            error.cause,
          );
          notifyError(error.message);
        } else {
          console.error("Capture submit failed", error);
          notifyError("Could not save. Please try again.");
        }
        return false;
      } finally {
        setSubmitting(false);
        setStep(null);
      }
    },
    [onSuccess, submitting],
  );

  return { submit, submitting, step };
}
