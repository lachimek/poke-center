import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { signUploadUrl } from "@/lib/storage/r2";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadPurpose =
  | "front_raw"
  | "front_processed"
  | "back_raw"
  | "back_processed";

export const REQUIRED_UPLOAD_PURPOSES: UploadPurpose[] = [
  "front_raw",
  "front_processed",
  "back_raw",
  "back_processed",
];

export type UploadedImageRecord = {
  id: string;
  objectKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  etag: string | null;
};

export function toObjectKey(
  userId: string,
  purpose: UploadPurpose,
  mimeType: string,
): string {
  const ext = IMAGE_MIME_TO_EXT[mimeType];
  return `users/${userId}/cards/${purpose}/${randomUUID()}.${ext}`;
}

export type ImageUploadRequest = {
  purpose: UploadPurpose;
  mimeType: string;
  byteSize: number;
};

export function isAllowedImageMimeType(mimeType: string): boolean {
  return mimeType in IMAGE_MIME_TO_EXT;
}

export function validateUploadRequest(
  input: ImageUploadRequest,
): string | null {
  if (!isAllowedImageMimeType(input.mimeType)) {
    return "Unsupported image type. Allowed: png, jpeg, webp.";
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    return "Image size must be a positive number.";
  }
  if (input.byteSize > MAX_IMAGE_BYTES) {
    return "Image exceeds size limit (10 MB).";
  }
  return null;
}

export async function createPresignedUpload(
  userId: string,
  input: ImageUploadRequest,
): Promise<{
  purpose: UploadPurpose;
  mimeType: string;
  byteSize: number;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
}> {
  const objectKey = toObjectKey(userId, input.purpose, input.mimeType);
  const signed = await signUploadUrl(objectKey, input.mimeType);
  return {
    purpose: input.purpose,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    objectKey,
    uploadUrl: signed.uploadUrl,
    expiresIn: signed.expiresIn,
  };
}

export type FinalizedUpload = {
  purpose: UploadPurpose;
  objectKey: string;
  mimeType: string;
  byteSize: number;
};

export type CardImageUploads = {
  frontRaw: UploadedImageRecord;
  frontProcessed: UploadedImageRecord;
  backRaw: UploadedImageRecord;
  backProcessed: UploadedImageRecord;
};

export async function persistUploadedImages(
  userId: string,
  uploads: FinalizedUpload[],
): Promise<CardImageUploads> {
  const rows = await db
    .insert(images)
    .values(
      uploads.map((upload) => ({
        userId,
        objectKey: upload.objectKey,
        publicUrl: `r2://${upload.objectKey}`,
        mimeType: upload.mimeType,
        sizeBytes: upload.byteSize,
        etag: null,
      })),
    )
    .returning({
      id: images.id,
      objectKey: images.objectKey,
      publicUrl: images.publicUrl,
      mimeType: images.mimeType,
      sizeBytes: images.sizeBytes,
      etag: images.etag,
    });

  const byPurpose = new Map(
    uploads.map((upload, idx) => [upload.purpose, rows[idx]]),
  );
  const frontRaw = byPurpose.get("front_raw");
  const frontProcessed = byPurpose.get("front_processed");
  const backRaw = byPurpose.get("back_raw");
  const backProcessed = byPurpose.get("back_processed");

  if (!frontRaw || !frontProcessed || !backRaw || !backProcessed) {
    throw new Error("Missing required uploaded image variants.");
  }

  return { frontRaw, frontProcessed, backRaw, backProcessed };
}
