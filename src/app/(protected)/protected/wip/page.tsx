import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WipCardRow } from "@/components/wip/WipCardRow";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { images, wipCards } from "@/lib/db/schema";
import { signObjectUrl } from "@/lib/storage/r2";

export default async function WipCardsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;
  const frontRawImage = alias(images, "front_raw_image");
  const backRawImage = alias(images, "back_raw_image");

  const rows = await db
    .select({
      id: wipCards.id,
      name: wipCards.name,
      createdAt: wipCards.createdAt,
      frontRawKey: frontRawImage.objectKey,
      backRawKey: backRawImage.objectKey,
    })
    .from(wipCards)
    .leftJoin(frontRawImage, eq(wipCards.frontRawImageId, frontRawImage.id))
    .leftJoin(backRawImage, eq(wipCards.backRawImageId, backRawImage.id))
    .where(eq(wipCards.userId, userId))
    .orderBy(desc(wipCards.createdAt));

  const cards = await Promise.all(
    rows.map(async (row) => {
      const [frontRawUrl, backRawUrl] = await Promise.all([
        row.frontRawKey ? signObjectUrl(row.frontRawKey) : null,
        row.backRawKey ? signObjectUrl(row.backRawKey) : null,
      ]);
      return {
        id: row.id,
        name: row.name,
        createdAt: row.createdAt,
        frontRawUrl,
        backRawUrl,
      };
    }),
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              ← Back to analyzer
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">
              Work-in-progress cards
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Photos captured on mobile. Open one to finish centering on
              desktop.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/protected/capture"
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              + Capture
            </Link>
            <Link
              href="/protected/cards"
              className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80"
            >
              Saved cards
            </Link>
          </div>
        </div>

        {cards.length === 0 ? (
          <p className="rounded-3xl border border-zinc-800 bg-zinc-900/60 px-5 py-8 text-center text-sm text-zinc-400">
            No WIP cards yet. Open{" "}
            <Link
              href="/protected/capture"
              className="text-emerald-300 underline hover:text-emerald-200"
            >
              Capture
            </Link>{" "}
            on your phone to add one.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {cards.map((card) => (
              <WipCardRow key={card.id} card={card} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
