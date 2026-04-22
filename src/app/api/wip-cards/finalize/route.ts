import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { images, wipCards } from "@/lib/db/schema";
import {
  type FinalizedUpload,
  isAllowedImageMimeType,
  validateUploadRequest,
} from "@/lib/storage/imageService";

const NAME_MAX_LEN = 120;

type WipUploadPurpose = "front_raw" | "back_raw";

const REQUIRED_WIP_PURPOSES: WipUploadPurpose[] = ["front_raw", "back_raw"];

type FinalizeUploadDescriptor = {
  purpose: WipUploadPurpose;
  objectKey: string;
  mimeType: string;
  byteSize: number;
};

function isWipUploadPurpose(value: unknown): value is WipUploadPurpose {
  return value === "front_raw" || value === "back_raw";
}

function isFinalizeUploadDescriptor(
  value: unknown,
): value is FinalizeUploadDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    isWipUploadPurpose(o.purpose) &&
    typeof o.objectKey === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.byteSize === "number"
  );
}

function getFinalizePayload(body: unknown): {
  name: string;
  uploads: FinalizeUploadDescriptor[];
} | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  if (typeof o.name !== "string") return null;
  if (!Array.isArray(o.uploads)) return null;
  if (!o.uploads.every(isFinalizeUploadDescriptor)) return null;
  return {
    name: o.name,
    uploads: o.uploads,
  };
}

function isOwnedObjectKey(userId: string, objectKey: string): boolean {
  return objectKey.startsWith(`users/${userId}/cards/`);
}

function toWipFinalizeUploads(
  uploads: FinalizeUploadDescriptor[],
): FinalizedUpload[] | null {
  const set = new Set(uploads.map((upload) => upload.purpose));
  const hasAll = REQUIRED_WIP_PURPOSES.every((purpose) => set.has(purpose));
  if (!hasAll || uploads.length !== REQUIRED_WIP_PURPOSES.length) {
    return null;
  }
  return uploads.map((upload) => ({
    purpose: upload.purpose,
    objectKey: upload.objectKey,
    mimeType: upload.mimeType,
    byteSize: upload.byteSize,
  }));
}

export async function POST(req: Request) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "You must be signed in." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = getFinalizePayload(body);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid finalize payload." },
      { status: 400 },
    );
  }

  const trimmed = parsed.name.trim();
  if (!trimmed) {
    return NextResponse.json(
      { ok: false, error: "Please enter a name for this card." },
      { status: 400 },
    );
  }
  if (trimmed.length > NAME_MAX_LEN) {
    return NextResponse.json(
      { ok: false, error: `Name must be at most ${NAME_MAX_LEN} characters.` },
      { status: 400 },
    );
  }

  const finalized = toWipFinalizeUploads(parsed.uploads);
  if (!finalized) {
    return NextResponse.json(
      { ok: false, error: "Missing required image variants." },
      { status: 400 },
    );
  }

  for (const upload of finalized) {
    if (!isOwnedObjectKey(userId, upload.objectKey)) {
      return NextResponse.json(
        { ok: false, error: "Upload key does not belong to current user." },
        { status: 400 },
      );
    }
    if (!isAllowedImageMimeType(upload.mimeType)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported image type. Allowed: png, jpeg, webp.",
        },
        { status: 400 },
      );
    }
    const validationError = validateUploadRequest({
      purpose: upload.purpose,
      mimeType: upload.mimeType,
      byteSize: upload.byteSize,
    });
    if (validationError) {
      return NextResponse.json(
        { ok: false, error: validationError },
        { status: 400 },
      );
    }
  }

  try {
    const rows = await db
      .insert(images)
      .values(
        finalized.map((upload) => ({
          userId,
          objectKey: upload.objectKey,
          publicUrl: `r2://${upload.objectKey}`,
          mimeType: upload.mimeType,
          sizeBytes: upload.byteSize,
          etag: null,
        })),
      )
      .returning({ id: images.id });

    const byPurpose = new Map(
      finalized.map((upload, idx) => [upload.purpose, rows[idx]]),
    );
    const frontRaw = byPurpose.get("front_raw");
    const backRaw = byPurpose.get("back_raw");
    if (!frontRaw || !backRaw) {
      throw new Error("Missing required uploaded image variants.");
    }

    const wipId = randomUUID();
    await db.insert(wipCards).values({
      id: wipId,
      userId,
      name: trimmed,
      frontRawImageId: frontRaw.id,
      backRawImageId: backRaw.id,
    });

    return NextResponse.json({ ok: true, id: wipId });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not save work-in-progress card.",
        cleanupCandidates: finalized.map((upload) => upload.objectKey),
      },
      { status: 500 },
    );
  }
}
