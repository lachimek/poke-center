import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { uploadImageBuffer } from "@/lib/storage/r2";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type UploadPurpose =
  | "front_raw"
  | "front_processed"
  | "back_raw"
  | "back_processed";

export type UploadedImageRecord = {
  id: string;
  objectKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  etag: string | null;
};

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("Image must be a valid base64 data URL.");
  }

  const mimeType = match[1].toLowerCase();
  if (!(mimeType in IMAGE_MIME_TO_EXT)) {
    throw new Error("Unsupported image type. Allowed: png, jpeg, webp.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0) {
    throw new Error("Image payload is empty.");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds size limit (10 MB).");
  }

  return { mimeType, buffer };
}

function toObjectKey(
  userId: string,
  purpose: UploadPurpose,
  mimeType: string,
): string {
  const ext = IMAGE_MIME_TO_EXT[mimeType];
  return `users/${userId}/cards/${purpose}/${randomUUID()}.${ext}`;
}

export async function uploadDataUrlImage(
  userId: string,
  dataUrl: string,
  purpose: UploadPurpose,
): Promise<UploadedImageRecord> {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const objectKey = toObjectKey(userId, purpose, mimeType);
  const uploaded = await uploadImageBuffer({
    objectKey,
    contentType: mimeType,
    body: buffer,
  });

  const [row] = await db
    .insert(images)
    .values({
      userId,
      objectKey: uploaded.objectKey,
      publicUrl: uploaded.objectUrl,
      mimeType,
      sizeBytes: uploaded.size,
      etag: uploaded.etag,
    })
    .returning({
      id: images.id,
      objectKey: images.objectKey,
      publicUrl: images.publicUrl,
      mimeType: images.mimeType,
      sizeBytes: images.sizeBytes,
      etag: images.etag,
    });

  return row;
}

export type CardImageUploads = {
  frontRaw: UploadedImageRecord;
  frontProcessed: UploadedImageRecord;
  backRaw: UploadedImageRecord;
  backProcessed: UploadedImageRecord;
};

export async function uploadCardImageSet(
  userId: string,
  payload: {
    frontRawImageSrc: string;
    frontImageSrc: string;
    backRawImageSrc: string;
    backImageSrc: string;
  },
): Promise<CardImageUploads> {
  const [frontRaw, frontProcessed, backRaw, backProcessed] = await Promise.all([
    uploadDataUrlImage(userId, payload.frontRawImageSrc, "front_raw"),
    uploadDataUrlImage(userId, payload.frontImageSrc, "front_processed"),
    uploadDataUrlImage(userId, payload.backRawImageSrc, "back_raw"),
    uploadDataUrlImage(userId, payload.backImageSrc, "back_processed"),
  ]);

  return { frontRaw, frontProcessed, backRaw, backProcessed };
}
