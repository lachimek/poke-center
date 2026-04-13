"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import {
  GRADING_COMPANY_TOOLTIPS,
  summarizeCenteringByCompany,
} from "@/lib/centering/gradeEstimate";
import type { SideResult } from "@/lib/centering/types";

type SummaryPanelProps = {
  front: SideResult;
  back: SideResult;
};

type AuthModal = "login" | "register" | null;

export function SummaryPanel({ front, back }: SummaryPanelProps) {
  const { data: session, status } = useSession();
  const [authModal, setAuthModal] = useState<AuthModal>(null);
  const [showRegisteredBanner, setShowRegisteredBanner] = useState(false);

  const openLogin = useCallback(() => {
    setAuthModal("login");
  }, []);

  const openRegister = useCallback(() => {
    setShowRegisteredBanner(false);
    setAuthModal("register");
  }, []);

  const closeModal = useCallback(() => {
    setAuthModal(null);
    setShowRegisteredBanner(false);
  }, []);

  const switchToLoginAfterRegister = useCallback(() => {
    setShowRegisteredBanner(true);
    setAuthModal("login");
  }, []);

  const gradeSummary = useMemo(
    () => summarizeCenteringByCompany(front, back),
    [front, back],
  );

  return (
    <aside className="flex min-w-0 flex-col gap-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              Summary
            </div>
            <h3 className="text-lg font-medium text-zinc-100">
              Centering grade hints
            </h3>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300/90">
            Live
          </div>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">
          Possible tier if centering alone matched common ratio cutoffs (both H
          and V per face). Not official grading.
        </p>
        <div className="space-y-2">
          {gradeSummary.map(({ company, bestTier, qualifies }) => (
            <div
              key={company}
              className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
            >
              <HoverTooltip
                className="shrink-0"
                label={company}
                content={GRADING_COMPANY_TOOLTIPS[company] ?? ""}
                side="top"
              />
              <span
                className={`text-right text-sm font-medium leading-snug ${
                  qualifies ? "text-emerald-200" : "text-zinc-500"
                }`}
              >
                {qualifies && bestTier ? bestTier : "Below listed tiers"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-zinc-800/80 pt-4">
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
            Your ratios
          </div>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2 text-zinc-400">
              <dt>Front</dt>
              <dd className="tabular-nums text-zinc-200">
                {front.horizontalDisplay} · {front.verticalDisplay}
              </dd>
            </div>
            <div className="flex justify-between gap-2 text-zinc-400">
              <dt>Back</dt>
              <dd className="tabular-nums text-zinc-200">
                {back.horizontalDisplay} · {back.verticalDisplay}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            Session
          </div>
          <h3 className="text-lg font-medium text-zinc-100">
            Measurement notes
          </h3>
        </div>
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 leading-relaxed">
            Use perspective correction for an angled photo, then drag one guide
            per side (L/R/T/B) to match the inner border; the frame is the
            opposite edge.
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 leading-relaxed">
            Front and back are independent. This tool is for pre-screening only
            — not official grading.
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            Account
          </div>
          <h3 className="text-lg font-medium text-zinc-100">
            {session?.user ? session.user.email : "Guest"}
          </h3>
        </div>

        {status !== "loading" && !session?.user && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openLogin}
              className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={openRegister}
              className="flex-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25"
            >
              Create account
            </button>
          </div>
        )}

        {session?.user && (
          <div className="flex flex-col gap-2">
            <Link
              href="/protected/cards"
              className="block w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 px-4 py-2.5 text-center text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              Saved cards
            </Link>
            <button
              type="button"
              onClick={() => signOut({ redirect: false })}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
            >
              Sign out
            </button>
          </div>
        )}
      </section>

      {authModal === "login" && (
        <LoginModal
          showRegisteredBanner={showRegisteredBanner}
          onClose={closeModal}
          onSwitchToRegister={openRegister}
        />
      )}
      {authModal === "register" && (
        <RegisterModal
          onClose={closeModal}
          onSwitchToLogin={switchToLoginAfterRegister}
        />
      )}
    </aside>
  );
}
