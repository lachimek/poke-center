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

function Row({
  label,
  value,
  horizontal = false,
}: {
  label: string;
  value: string;
  horizontal?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 font-mono text-xs">
      <div className="flex items-center gap-1 text-zinc-500">
        <span className="shrink-0">{label}</span>
        {horizontal ? (
          <FoldHorizontal className="h-4 w-4 shrink-0" />
        ) : (
          <FoldVertical className="h-4 w-4 shrink-0" />
        )}
      </div>
      <span className="tabular-nums text-zinc-100">{value}</span>
    </div>
  );
}

export function SummaryPanel({
  front,
  back,
  onResetGuidesAll,
  onResetAll,
}: SummaryPanelProps) {
  const copyValues = useCallback(async () => {
    const lines = [
      "PokéCentering — summary",
      `Front H: ${front.horizontalDisplay}  V: ${front.verticalDisplay}`,
      `Back H: ${back.horizontalDisplay}  V: ${back.verticalDisplay}`,
      `Front effective margins (mean of pairs, logical px): L ${front.leftMargin.toFixed(1)} · R ${front.rightMargin.toFixed(1)} · T ${front.topMargin.toFixed(1)} · B ${front.bottomMargin.toFixed(1)}`,
      `Back effective margins (mean of pairs, logical px): L ${back.leftMargin.toFixed(1)} · R ${back.rightMargin.toFixed(1)} · T ${back.topMargin.toFixed(1)} · B ${back.bottomMargin.toFixed(1)}`,
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, [front, back]);

  return (
    <aside className="flex min-w-[280px] max-w-sm flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-lg">
      <div>
        <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-500/90">
          Card result
        </h3>
        <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3">
          <Row
            label="Front horizontal"
            value={front.horizontalDisplay}
            horizontal
          />
          <Row label="Front vertical" value={front.verticalDisplay} />
        </div>
        <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800/60 bg-zinc-950/50 px-3 mt-3">
          <Row
            label="Back horizontal"
            value={back.horizontalDisplay}
            horizontal
          />
          <Row label="Back vertical" value={back.verticalDisplay} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Measurement notes
        </h3>
        <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-zinc-400">
          <li>Use a straight photo with soft, even light.</li>
          <li>
            Outer border is the fixed frame. Each side has two guides (e.g.
            L1/L2) to bracket the inner transition; ratios use the average of
            each pair.
          </li>
          <li>This tool is for pre-screening only — not official grading.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Actions
        </h3>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void copyValues()}
            className="rounded-lg border border-zinc-600 bg-zinc-800/80 py-2 font-mono text-xs text-zinc-200 transition hover:border-amber-600/40 hover:bg-zinc-800 cursor-pointer"
          >
            Copy values
          </button>
          <button
            type="button"
            onClick={onResetGuidesAll}
            className="rounded-lg border border-zinc-600 bg-zinc-800/80 py-2 font-mono text-xs text-zinc-200 transition hover:bg-zinc-800 cursor-pointer"
          >
            Reset guides (both)
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-lg border border-zinc-600 bg-zinc-800/80 py-2 font-mono text-xs text-zinc-200 transition hover:bg-zinc-800 cursor-pointer"
          >
            Reset all
          </button>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-lg border border-dashed border-zinc-700 py-2 font-mono text-xs text-zinc-600"
            title="Coming later"
          >
            Export overlay (soon)
          </button>
        </div>
      </div>
    </aside>
  );
}
