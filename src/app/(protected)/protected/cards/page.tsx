import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SavedCardThumbnailPreview } from "@/components/centering/SavedCardThumbnailPreview";
import { getSession } from "@/lib/auth";
import {
  formatGradeSummaryForList,
  summarizeCenteringByCompany,
} from "@/lib/centering/gradeEstimate";
import { computeSideResult } from "@/lib/centering/math";
import { toCenteringSessionPayload } from "@/lib/centering/savedCardMapper";
import { db } from "@/lib/db";
import { savedCards } from "@/lib/db/schema";

export default async function SavedCardsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;

  const rows = await db
    .select()
    .from(savedCards)
    .where(eq(savedCards.userId, userId))
    .orderBy(desc(savedCards.createdAt));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            ← Back to analyzer
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Saved cards
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Centering snapshots saved to your account.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-3xl border border-zinc-800 bg-zinc-900/60 px-5 py-8 text-center text-sm text-zinc-400">
            No saved cards yet. Use &quot;Save to account&quot; on the main page
            after signing in.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => {
              const payload = toCenteringSessionPayload(row);
              const frontR = computeSideResult(payload.front.guides);
              const backR = computeSideResult(payload.back.guides);
              const summary = summarizeCenteringByCompany(frontR, backR);
              const gradeLine = formatGradeSummaryForList(summary);

              return (
                <li
                  key={row.id}
                  className="flex gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 shadow-lg shadow-black/20"
                >
                  <SavedCardThumbnailPreview src={row.frontImageSrc} alt="">
                    <div className="relative h-[88px] w-[63px] shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
                      {/* biome-ignore lint/performance/noImgElement: data URLs from DB */}
                      <img
                        src={row.frontImageSrc}
                        alt=""
                        width={63}
                        height={88}
                        className="h-[88px] w-[63px] object-cover"
                      />
                    </div>
                  </SavedCardThumbnailPreview>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-100">{row.name}</div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {gradeLine}
                    </p>
                    <dl className="mt-2 grid gap-1 text-xs text-zinc-500">
                      <div className="flex flex-wrap justify-start gap-x-3 gap-y-0.5">
                        <dt className="shrink-0 text-zinc-500">Front</dt>
                        <dd className="min-w-0 text-right tabular-nums text-zinc-300">
                          {frontR.horizontalDisplay} · {frontR.verticalDisplay}
                        </dd>
                      </div>
                      <div className="flex flex-wrap justify-start gap-x-3 gap-y-0.5">
                        <dt className="shrink-0 text-zinc-500">Back</dt>
                        <dd className="min-w-0 text-right tabular-nums text-zinc-300">
                          {backR.horizontalDisplay} · {backR.verticalDisplay}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
