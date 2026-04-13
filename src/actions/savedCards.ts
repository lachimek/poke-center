"use server";

import { getSession } from "@/lib/auth";
import { toSavedCardInsert } from "@/lib/centering/savedCardMapper";
import { isCenteringSessionConfiguration } from "@/lib/centering/sessionConfiguration";
import { isAccountSavePayload } from "@/lib/centering/sessionPayload";
import { db } from "@/lib/db";
import { savedCards } from "@/lib/db/schema";

const NAME_MAX_LEN = 120;

export type SaveCardToAccountResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveCardToAccount(
  name: string,
  payload: unknown,
): Promise<SaveCardToAccountResult> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "You must be signed in to save a card." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a name for this card." };
  }
  if (trimmed.length > NAME_MAX_LEN) {
    return {
      ok: false,
      error: `Name must be at most ${NAME_MAX_LEN} characters.`,
    };
  }

  if (!isAccountSavePayload(payload)) {
    return {
      ok: false,
      error: "Invalid card data. Upload both sides and try again.",
    };
  }

  const insert = toSavedCardInsert(userId, trimmed, payload);
  if (!isCenteringSessionConfiguration(insert.configuration)) {
    return { ok: false, error: "Invalid configuration." };
  }

  try {
    await db.insert(savedCards).values(insert);
  } catch {
    return { ok: false, error: "Could not save. Please try again." };
  }

  return { ok: true };
}
