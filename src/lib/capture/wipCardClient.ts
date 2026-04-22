import type { CapturedSide, WipUploadPurpose } from "./types";

export type WipSubmitStep =
  | "create"
  | "upload-front"
  | "upload-back"
  | "finalize";

export type WipSubmitPayload = {
  name: string;
  front: CapturedSide;
  back: CapturedSide;
};

export type WipSubmitResult = { id: string };

type CreateUploadsResponse =
  | {
      ok: true;
      uploads: Array<{
        purpose: WipUploadPurpose;
        mimeType: string;
        byteSize: number;
        objectKey: string;
        uploadUrl: string;
      }>;
    }
  | { ok: false; error: string };

type FinalizeResponse = { ok: true; id: string } | { ok: false; error: string };

type SignedUpload = {
  purpose: WipUploadPurpose;
  mimeType: string;
  byteSize: number;
  objectKey: string;
  uploadUrl: string;
};

export class WipSubmitError extends Error {
  readonly step: WipSubmitStep;
  readonly cause?: unknown;

  constructor(step: WipSubmitStep, message: string, cause?: unknown) {
    super(message);
    this.name = "WipSubmitError";
    this.step = step;
    this.cause = cause;
  }
}

function asSubmitError(step: WipSubmitStep, error: unknown): WipSubmitError {
  if (error instanceof WipSubmitError) return error;
  const isLoadFailed =
    error instanceof TypeError &&
    /load failed|network|fetch/i.test(error.message);
  const message =
    step === "upload-front" || step === "upload-back"
      ? isLoadFailed
        ? "Image upload blocked. Check R2 CORS for this origin."
        : "Image upload failed. Please try again."
      : step === "create"
        ? "Could not start upload. Please try again."
        : "Could not save. Please try again.";
  return new WipSubmitError(step, message, error);
}

async function putBlob(
  signed: SignedUpload,
  side: CapturedSide,
): Promise<void> {
  const res = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": side.mimeType },
    body: side.blob,
  });
  if (!res.ok) {
    const step: WipSubmitStep =
      signed.purpose === "front_raw" ? "upload-front" : "upload-back";
    throw new WipSubmitError(
      step,
      `Upload failed (HTTP ${res.status}). Please try again.`,
    );
  }
}

/**
 * Upload two freshly-captured card sides and create a WIP card row.
 *
 * Orchestrates the 3-step flow:
 *   1. POST /api/wip-cards/create → presigned URLs
 *   2. PUT each image blob to its presigned URL
 *   3. POST /api/wip-cards/finalize → DB row
 *
 * Throws {@link WipSubmitError} with the failing step so callers can surface
 * granular errors (CORS hints for PUTs vs. server errors for JSON endpoints).
 */
export async function submitWipCard(
  payload: WipSubmitPayload,
  onStep?: (step: WipSubmitStep) => void,
): Promise<WipSubmitResult> {
  const { name, front, back } = payload;

  onStep?.("create");
  let createJson: CreateUploadsResponse;
  try {
    const createRes = await fetch("/api/wip-cards/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploads: [
          {
            purpose: "front_raw" satisfies WipUploadPurpose,
            mimeType: front.mimeType,
            byteSize: front.byteSize,
          },
          {
            purpose: "back_raw" satisfies WipUploadPurpose,
            mimeType: back.mimeType,
            byteSize: back.byteSize,
          },
        ],
      }),
    });
    createJson = (await createRes.json()) as CreateUploadsResponse;
    if (!createRes.ok || !createJson.ok) {
      throw new WipSubmitError(
        "create",
        createJson.ok
          ? "Could not start upload."
          : createJson.error || "Could not start upload.",
      );
    }
  } catch (error) {
    throw asSubmitError("create", error);
  }

  const byPurpose = new Map<WipUploadPurpose, SignedUpload>(
    createJson.uploads.map((upload) => [upload.purpose, upload]),
  );
  const frontSigned = byPurpose.get("front_raw");
  const backSigned = byPurpose.get("back_raw");
  if (!frontSigned || !backSigned) {
    throw new WipSubmitError(
      "create",
      "Upload session is missing required image variants.",
    );
  }

  onStep?.("upload-front");
  try {
    await putBlob(frontSigned, front);
  } catch (error) {
    throw asSubmitError("upload-front", error);
  }

  onStep?.("upload-back");
  try {
    await putBlob(backSigned, back);
  } catch (error) {
    throw asSubmitError("upload-back", error);
  }

  onStep?.("finalize");
  try {
    const finalizeRes = await fetch("/api/wip-cards/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        uploads: [
          {
            purpose: "front_raw" satisfies WipUploadPurpose,
            objectKey: frontSigned.objectKey,
            mimeType: frontSigned.mimeType,
            byteSize: frontSigned.byteSize,
          },
          {
            purpose: "back_raw" satisfies WipUploadPurpose,
            objectKey: backSigned.objectKey,
            mimeType: backSigned.mimeType,
            byteSize: backSigned.byteSize,
          },
        ],
      }),
    });
    const finalizeJson = (await finalizeRes.json()) as FinalizeResponse;
    if (!finalizeRes.ok || !finalizeJson.ok) {
      throw new WipSubmitError(
        "finalize",
        finalizeJson.ok
          ? "Could not save. Please try again."
          : finalizeJson.error || "Could not save. Please try again.",
      );
    }
    return { id: finalizeJson.id };
  } catch (error) {
    throw asSubmitError("finalize", error);
  }
}
