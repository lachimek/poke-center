import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toSavedCardInsertFromConfiguration } from "@/lib/centering/savedCardMapper";
import {
  type CenteringSessionConfiguration,
  isCenteringSessionConfiguration,
} from "@/lib/centering/sessionConfiguration";
import { db } from "@/lib/db";
import { savedCards } from "@/lib/db/schema";
import {
  type FinalizedUpload,
  isAllowedImageMimeType,
  persistUploadedImages,
  REQUIRED_UPLOAD_PURPOSES,
  type UploadPurpose,
  validateUploadRequest,
} from "@/lib/storage/imageService";

const NAME_MAX_LEN = 120;

type FinalizeUploadDescriptor = {
  purpose: UploadPurpose;
  objectKey: string;
  mimeType: string;
  byteSize: number;
};

function isUploadPurpose(value: unknown): value is UploadPurpose {
  return (
    value === "front_raw" ||
    value === "front_processed" ||
    value === "back_raw" ||
    value === "back_processed"
  );
}

function isFinalizeUploadDescriptor(
  value: unknown,
): value is FinalizeUploadDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    isUploadPurpose(o.purpose) &&
    typeof o.objectKey === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.byteSize === "number"
  );
}

function getFinalizePayload(body: unknown): {
  name: string;
  configuration: CenteringSessionConfiguration;
  uploads: FinalizeUploadDescriptor[];
} | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  if (typeof o.name !== "string") return null;
  if (!isCenteringSessionConfiguration(o.configuration)) return null;
  if (!Array.isArray(o.uploads)) return null;
  if (!o.uploads.every(isFinalizeUploadDescriptor)) return null;
  return {
    name: o.name,
    configuration: o.configuration,
    uploads: o.uploads,
  };
}

function isOwnedObjectKey(userId: string, objectKey: string): boolean {
  return objectKey.startsWith(`users/${userId}/cards/`);
}

function toFinalizeUploads(
  uploads: FinalizeUploadDescriptor[],
): FinalizedUpload[] | null {
  const set = new Set(uploads.map((upload) => upload.purpose));
  const hasAll = REQUIRED_UPLOAD_PURPOSES.every((purpose) => set.has(purpose));
  if (!hasAll || uploads.length !== REQUIRED_UPLOAD_PURPOSES.length) {
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

  const finalized = toFinalizeUploads(parsed.uploads);
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
    const persisted = await persistUploadedImages(userId, finalized);
    const insert = toSavedCardInsertFromConfiguration(
      userId,
      trimmed,
      parsed.configuration,
      {
        frontRawImageId: persisted.frontRaw.id,
        frontImageId: persisted.frontProcessed.id,
        backRawImageId: persisted.backRaw.id,
        backImageId: persisted.backProcessed.id,
      },
    );
    await db.insert(savedCards).values(insert);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not finalize save.",
        cleanupCandidates: finalized.map((upload) => upload.objectKey),
      },
      { status: 500 },
    );
  }
}
