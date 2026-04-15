"use server";

import { getSession } from "@/lib/auth";
import { toSavedCardInsert } from "@/lib/centering/savedCardMapper";
import { isCenteringSessionConfiguration } from "@/lib/centering/sessionConfiguration";
import { isAccountSavePayload } from "@/lib/centering/sessionPayload";
import { db } from "@/lib/db";
import { savedCards } from "@/lib/db/schema";
import { uploadCardImageSet } from "@/lib/storage/imageService";

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

  const { rawImageSrc: _fr, imageSrc: _fi, ...frontCfg } = payload.front;
  const { rawImageSrc: _br, imageSrc: _bi, ...backCfg } = payload.back;
  if (
    !isCenteringSessionConfiguration({
      v: payload.v,
      front: frontCfg,
      back: backCfg,
    })
  ) {
    return { ok: false, error: "Invalid configuration." };
  }

  try {
    const frontRawImageSrc = payload.front.rawImageSrc as string;
    const frontImageSrc = payload.front.imageSrc as string;
    const backRawImageSrc = payload.back.rawImageSrc as string;
    const backImageSrc = payload.back.imageSrc as string;

    const uploaded = await uploadCardImageSet(userId, {
      frontRawImageSrc,
      frontImageSrc,
      backRawImageSrc,
      backImageSrc,
    });

    const insert = toSavedCardInsert(userId, trimmed, payload, {
      frontRawImageId: uploaded.frontRaw.id,
      frontImageId: uploaded.frontProcessed.id,
      backRawImageId: uploaded.backRaw.id,
      backImageId: uploaded.backProcessed.id,
    });

    await db.insert(savedCards).values(insert);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not save. Please try again.";
    return { ok: false, error: message };
  }

  return { ok: true };
}
