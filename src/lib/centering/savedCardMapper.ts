import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { CenteringSessionConfiguration } from "@/lib/centering/sessionConfiguration";
import type { CenteringSessionPayload } from "@/lib/centering/sessionPayload";
import type { savedCards } from "@/lib/db/schema";

export type SavedCardRow = InferSelectModel<typeof savedCards>;

export type SavedCardInsert = InferInsertModel<typeof savedCards>;

function toConfiguration(
  payload: CenteringSessionPayload,
): CenteringSessionConfiguration {
  const { rawImageSrc: _fr, imageSrc: _fi, ...front } = payload.front;
  const { rawImageSrc: _br, imageSrc: _bi, ...back } = payload.back;
  return { v: payload.v, front, back };
}

export function toSavedCardInsert(
  userId: string,
  name: string,
  payload: CenteringSessionPayload,
): SavedCardInsert {
  const { front, back } = payload;
  return {
    userId,
    name,
    frontRawImageSrc: front.rawImageSrc as string,
    frontImageSrc: front.imageSrc as string,
    backRawImageSrc: back.rawImageSrc as string,
    backImageSrc: back.imageSrc as string,
    configuration: toConfiguration(payload),
  };
}

export function toCenteringSessionPayload(
  row: SavedCardRow,
): CenteringSessionPayload {
  const cfg = row.configuration;
  return {
    v: cfg.v,
    front: {
      ...cfg.front,
      rawImageSrc: row.frontRawImageSrc,
      imageSrc: row.frontImageSrc,
    },
    back: {
      ...cfg.back,
      rawImageSrc: row.backRawImageSrc,
      imageSrc: row.backImageSrc,
    },
  };
}
