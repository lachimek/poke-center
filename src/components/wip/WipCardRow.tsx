"use client";

import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { notifyError, notifySuccess } from "@/lib/toast";

type WipCardListItem = {
  id: string;
  name: string;
  createdAt: Date;
  frontRawUrl: string | null;
  backRawUrl: string | null;
};

type WipCardRowProps = {
  card: WipCardListItem;
};

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WipCardRow({ card }: WipCardRowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (deleting) return;
    const ok = window.confirm(`Delete "${card.name}"? This cannot be undone.`);
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wip-cards/${card.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        notifyError(json.error || "Could not delete WIP card.");
        return;
      }
      notifySuccess("WIP card deleted.");
      router.refresh();
    } catch {
      notifyError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="flex gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 shadow-lg shadow-black/20">
      <div className="flex shrink-0 gap-2">
        <div className="relative h-[88px] w-[63px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
          {card.frontRawUrl ? (
            // biome-ignore lint/performance/noImgElement: DB stores image URLs for previews
            <img
              src={card.frontRawUrl}
              alt=""
              width={63}
              height={88}
              className="h-[88px] w-[63px] object-cover"
            />
          ) : null}
        </div>
        <div className="relative h-[88px] w-[63px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
          {card.backRawUrl ? (
            // biome-ignore lint/performance/noImgElement: DB stores image URLs for previews
            <img
              src={card.backRawUrl}
              alt=""
              width={63}
              height={88}
              className="h-[88px] w-[63px] object-cover"
            />
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="truncate font-medium text-zinc-100">{card.name}</div>
          <p className="mt-1 text-xs text-zinc-500">
            Captured {formatDate(card.createdAt)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={`/?wip=${encodeURIComponent(card.id)}`}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
          >
            Open in analyzer
          </Link>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
