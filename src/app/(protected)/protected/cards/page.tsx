import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import { images, savedCards } from "@/lib/db/schema";
import { signObjectUrl } from "@/lib/storage/r2";

export default async function SavedCardsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;
  const frontRawImage = alias(images, "front_raw_image");
  const frontImage = alias(images, "front_image");
  const backRawImage = alias(images, "back_raw_image");
  const backImage = alias(images, "back_image");

  const rows = await db
    .select({
      card: savedCards,
      frontRawImageUrl: frontRawImage.publicUrl,
      frontRawImageKey: frontRawImage.objectKey,
      frontImageUrl: frontImage.publicUrl,
      frontImageKey: frontImage.objectKey,
      backRawImageUrl: backRawImage.publicUrl,
      backRawImageKey: backRawImage.objectKey,
      backImageUrl: backImage.publicUrl,
      backImageKey: backImage.objectKey,
    })
    .from(savedCards)
    .leftJoin(frontRawImage, eq(savedCards.frontRawImageId, frontRawImage.id))
    .leftJoin(frontImage, eq(savedCards.frontImageId, frontImage.id))
    .leftJoin(backRawImage, eq(savedCards.backRawImageId, backRawImage.id))
    .leftJoin(backImage, eq(savedCards.backImageId, backImage.id))
    .where(eq(savedCards.userId, userId))
    .orderBy(desc(savedCards.createdAt));

  const cards = await Promise.all(
    rows.map(async (row) => {
      const [frontRawSigned, frontSigned, backRawSigned, backSigned] =
        await Promise.all([
          row.frontRawImageKey ? signObjectUrl(row.frontRawImageKey) : null,
          row.frontImageKey ? signObjectUrl(row.frontImageKey) : null,
          row.backRawImageKey ? signObjectUrl(row.backRawImageKey) : null,
          row.backImageKey ? signObjectUrl(row.backImageKey) : null,
        ]);

      const hydrated = {
        frontRawImageSrc: frontRawSigned ?? row.frontRawImageUrl ?? "",
        frontImageSrc: frontSigned ?? row.frontImageUrl ?? "",
        backRawImageSrc: backRawSigned ?? row.backRawImageUrl ?? "",
        backImageSrc: backSigned ?? row.backImageUrl ?? "",
      };

      return {
        row,
        hydrated,
        payload: toCenteringSessionPayload(row.card, hydrated),
      };
    }),
  );

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
            {cards.map(({ row, hydrated, payload }) => {
              const frontR = computeSideResult(payload.front.guides);
              const backR = computeSideResult(payload.back.guides);
              const summary = summarizeCenteringByCompany(frontR, backR);
              const gradeLine = formatGradeSummaryForList(summary);

              return (
                <li
                  key={row.card.id}
                  className="flex gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 shadow-lg shadow-black/20"
                >
                  <SavedCardThumbnailPreview
                    src={hydrated.frontImageSrc}
                    alt=""
                  >
                    <div className="relative h-[88px] w-[63px] shrink-0 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950">
                      {/* biome-ignore lint/performance/noImgElement: DB stores image URLs for previews */}
                      <img
                        src={hydrated.frontImageSrc}
                        alt=""
                        width={63}
                        height={88}
                        className="h-[88px] w-[63px] object-cover"
                      />
                    </div>
                  </SavedCardThumbnailPreview>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-100">
                      {row.card.name}
                    </div>
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
