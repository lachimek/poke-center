import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { CenteringSessionConfiguration } from "@/lib/centering/sessionConfiguration";
import type { CenteringSessionPayload } from "@/lib/centering/sessionPayload";
import type { savedCards } from "@/lib/db/schema";

export type SavedCardRow = InferSelectModel<typeof savedCards>;

export type SavedCardInsert = InferInsertModel<typeof savedCards>;
export type SavedCardImageRefs = {
  frontRawImageId: string;
  frontImageId: string;
  backRawImageId: string;
  backImageId: string;
};

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
  imageRefs: SavedCardImageRefs,
): SavedCardInsert {
  return toSavedCardInsertFromConfiguration(
    userId,
    name,
    toConfiguration(payload),
    imageRefs,
  );
}

export function toSavedCardInsertFromConfiguration(
  userId: string,
  name: string,
  configuration: CenteringSessionConfiguration,
  imageRefs: SavedCardImageRefs,
): SavedCardInsert {
  return {
    userId,
    name,
    frontRawImageId: imageRefs.frontRawImageId,
    frontImageId: imageRefs.frontImageId,
    backRawImageId: imageRefs.backRawImageId,
    backImageId: imageRefs.backImageId,
    configuration,
  };
}

export function toCenteringSessionPayload(
  row: SavedCardRow,
  imageSrc: {
    frontRawImageSrc: string;
    frontImageSrc: string;
    backRawImageSrc: string;
    backImageSrc: string;
  },
): CenteringSessionPayload {
  const cfg = row.configuration;
  return {
    v: cfg.v,
    front: {
      ...cfg.front,
      rawImageSrc: imageSrc.frontRawImageSrc,
      imageSrc: imageSrc.frontImageSrc,
    },
    back: {
      ...cfg.back,
      rawImageSrc: imageSrc.backRawImageSrc,
      imageSrc: imageSrc.backImageSrc,
    },
  };
}
