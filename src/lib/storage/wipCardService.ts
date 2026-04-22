import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { images, wipCards } from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage/r2";

/**
 * Delete a WIP card along with its associated image rows and R2 objects.
 * Returns true when a matching row was deleted, false otherwise.
 *
 * R2 object deletion is best-effort: if a single object fails to delete we log
 * and continue — the DB rows are always removed so the user is not blocked.
 */
export async function deleteWipCardCascade(
  userId: string,
  wipCardId: string,
): Promise<boolean> {
  const [card] = await db
    .select({
      id: wipCards.id,
      frontRawImageId: wipCards.frontRawImageId,
      backRawImageId: wipCards.backRawImageId,
    })
    .from(wipCards)
    .where(and(eq(wipCards.id, wipCardId), eq(wipCards.userId, userId)))
    .limit(1);

  if (!card) return false;

  const imageIds = [card.frontRawImageId, card.backRawImageId].filter(
    (v): v is string => typeof v === "string",
  );

  let imageRows: { id: string; objectKey: string }[] = [];
  if (imageIds.length > 0) {
    imageRows = await db
      .select({ id: images.id, objectKey: images.objectKey })
      .from(images)
      .where(and(inArray(images.id, imageIds), eq(images.userId, userId)));
  }

  await db
    .delete(wipCards)
    .where(and(eq(wipCards.id, wipCardId), eq(wipCards.userId, userId)));

  if (imageRows.length > 0) {
    await db.delete(images).where(
      and(
        inArray(
          images.id,
          imageRows.map((row) => row.id),
        ),
        eq(images.userId, userId),
      ),
    );

    await Promise.all(
      imageRows.map(async (row) => {
        try {
          await deleteObject(row.objectKey);
        } catch (error) {
          console.warn(
            `Failed to delete R2 object ${row.objectKey} while removing WIP card ${wipCardId}:`,
            error,
          );
        }
      }),
    );
  }

  return true;
}
