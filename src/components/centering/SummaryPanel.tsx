"use client";

import { FoldHorizontal, FoldVertical } from "lucide-react";
import { useCallback } from "react";
import type { GuideLines, SideResult } from "@/lib/centering/types";

type SummaryPanelProps = {
  front: SideResult;
  back: SideResult;
  frontGuides: GuideLines;
  backGuides: GuideLines;
  onResetGuidesAll: () => void;
  onResetAll: () => void;
};

function fmtGuides(g: GuideLines): string {
  return `L ${g.left1}/${g.left2} · R ${g.right1}/${g.right2} · T ${g.top1}/${g.top2} · B ${g.bottom1}/${g.bottom2}`;
}

export function SummaryPanel({
  front,
  back,
  frontGuides,
  backGuides,
  onResetGuidesAll,
  onResetAll,
}: SummaryPanelProps) {
  const copyValues = useCallback(async () => {
    const lines = [
      "PokéCentering — summary",
      `Front H: ${front.horizontalDisplay}  V: ${front.verticalDisplay}`,
      `Back H: ${back.horizontalDisplay}  V: ${back.verticalDisplay}`,
      `Front margins (logical px): L ${front.leftMargin.toFixed(1)} · R ${front.rightMargin.toFixed(1)} · T ${front.topMargin.toFixed(1)} · B ${front.bottomMargin.toFixed(1)}`,
      `Back margins (logical px): L ${back.leftMargin.toFixed(1)} · R ${back.rightMargin.toFixed(1)} · T ${back.topMargin.toFixed(1)} · B ${back.bottomMargin.toFixed(1)}`,
      `Front guides: ${fmtGuides(frontGuides)}`,
      `Back guides: ${fmtGuides(backGuides)}`,
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [front, back, frontGuides, backGuides]);

  const rows: { label: string; value: string; horizontal: boolean }[] = [
    {
      label: "Front H",
      value: front.horizontalDisplay,
      horizontal: true,
    },
    {
      label: "Front V",
      value: front.verticalDisplay,
      horizontal: false,
    },
    {
      label: "Back H",
      value: back.horizontalDisplay,
      horizontal: true,
    },
    {
      label: "Back V",
      value: back.verticalDisplay,
      horizontal: false,
    },
  ];

  return (
    <aside className="flex min-w-0 flex-col gap-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              Summary
            </div>
            <h3 className="text-lg font-medium text-zinc-100">Card result</h3>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300/90">
            Live
          </div>
        </div>
        <div className="space-y-3">
          {rows.map(({ label, value, horizontal }) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm text-zinc-400">
                {horizontal ? (
                  <FoldHorizontal
                    className="h-4 w-4 shrink-0 text-zinc-500"
                    aria-hidden
                  />
                ) : (
                  <FoldVertical
                    className="h-4 w-4 shrink-0 text-zinc-500"
                    aria-hidden
                  />
                )}
                {label}
              </span>
              <span className="text-sm font-medium tabular-nums text-zinc-100">
                {value}
              </span>
            </div>
          ))}
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
            Use a straight photo with soft light. Align the card to the fixed
            frame, then drag the guides. Each edge uses two marks (e.g. L1/L2);
            ratios use the mean of each pair.
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
            Actions
          </div>
          <h3 className="text-lg font-medium text-zinc-100">Workflow</h3>
        </div>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => void copyValues()}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900/80"
          >
            Copy values
          </button>
          <button
            type="button"
            onClick={onResetGuidesAll}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900/80"
          >
            Reset guides (both sides)
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900/80"
          >
            Reset all
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-left text-sm font-medium text-emerald-300/50 opacity-70"
            title="Coming later"
          >
            Export overlay image
          </button>
        </div>
      </section>
    </aside>
  );
}
