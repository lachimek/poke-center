"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { CaptureSideTile } from "@/components/capture/CaptureSideTile";
import { useCapturedSides } from "@/hooks/useCapturedSides";
import { useWipCardSubmit } from "@/hooks/useWipCardSubmit";
import type { SideKey } from "@/lib/capture/types";
import type { WipSubmitStep } from "@/lib/capture/wipCardClient";
import { notifySuccess } from "@/lib/toast";

const NAME_MAX_LEN = 120;

const STEP_LABELS: Record<WipSubmitStep, string> = {
  create: "Starting upload…",
  "upload-front": "Uploading front…",
  "upload-back": "Uploading back…",
  finalize: "Saving card…",
};

export function MobileCaptureApp() {
  const router = useRouter();
  const nameInputId = useId();
  const {
    sides,
    processing,
    pick,
    retake,
    reset: resetSides,
  } = useCapturedSides();
  const { front, back } = sides;

  const [name, setName] = useState("");

  const { submit, submitting, step } = useWipCardSubmit({
    onSuccess: ({ name: savedName }) => {
      notifySuccess(`Saved "${savedName}" to your work-in-progress list.`);
      resetSides();
      setName("");
      router.push("/protected/wip");
    },
  });

  const onPick = useCallback(
    (side: SideKey) => (file: File) => {
      void pick(side, file);
    },
    [pick],
  );

  const onRetake = useCallback(
    (side: SideKey) => () => {
      retake(side);
    },
    [retake],
  );

  const onSubmit = useCallback(() => {
    void submit({ name, front, back });
  }, [submit, name, front, back]);

  const trimmedName = name.trim();
  const canSubmit =
    !!front && !!back && trimmedName.length > 0 && !submitting && !processing;

  const submitLabel = useMemo(() => {
    if (!submitting) return "Save card";
    return step ? STEP_LABELS[step] : "Saving…";
  }, [submitting, step]);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-6 sm:px-6">
        <header className="mb-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            ← Back to analyzer
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Capture card
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Take a photo of the front and back. You can finish centering on
            desktop later.
          </p>
        </header>

        <div className="flex flex-col gap-4 pb-6">
          <CaptureSideTile
            title="Front"
            subtitle="Side A"
            captured={front}
            processing={processing === "front"}
            disabled={submitting}
            onPick={onPick("front")}
            onRetake={onRetake("front")}
          />
          <CaptureSideTile
            title="Back"
            subtitle="Side B"
            captured={back}
            processing={processing === "back"}
            disabled={submitting}
            onPick={onPick("back")}
            onRetake={onRetake("back")}
          />
        </div>
      </main>

      <div
        className="sticky bottom-0 z-10 mt-auto border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
        }}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-3 sm:px-6">
          <label
            htmlFor={nameInputId}
            className="block text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500"
          >
            Card name
          </label>
          <input
            id={nameInputId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LEN}
            placeholder="e.g. Charizard base set"
            disabled={submitting}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="done"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-zinc-100 outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2"
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-busy={submitting}
            className="flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 transition active:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
