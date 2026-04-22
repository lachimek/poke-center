import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createPresignedUpload,
  type ImageUploadRequest,
  validateUploadRequest,
} from "@/lib/storage/imageService";

type WipUploadPurpose = "front_raw" | "back_raw";

const REQUIRED_WIP_PURPOSES: WipUploadPurpose[] = ["front_raw", "back_raw"];

type UploadDescriptor = {
  purpose: WipUploadPurpose;
  mimeType: string;
  byteSize: number;
};

function isWipUploadPurpose(value: unknown): value is WipUploadPurpose {
  return value === "front_raw" || value === "back_raw";
}

function isUploadDescriptor(value: unknown): value is UploadDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    isWipUploadPurpose(o.purpose) &&
    typeof o.mimeType === "string" &&
    typeof o.byteSize === "number"
  );
}

function getCreatePayload(
  body: unknown,
): { uploads: UploadDescriptor[] } | null {
  if (typeof body !== "object" || body === null) return null;
  const o = body as Record<string, unknown>;
  if (!Array.isArray(o.uploads)) return null;
  if (!o.uploads.every(isUploadDescriptor)) return null;
  return { uploads: o.uploads };
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

  const parsed = getCreatePayload(body);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid upload payload." },
      { status: 400 },
    );
  }

  if (parsed.uploads.length !== REQUIRED_WIP_PURPOSES.length) {
    return NextResponse.json(
      { ok: false, error: "Exactly two upload descriptors are required." },
      { status: 400 },
    );
  }

  const uniquePurposes = new Set(
    parsed.uploads.map((upload) => upload.purpose),
  );
  const hasAllPurposes = REQUIRED_WIP_PURPOSES.every((purpose) =>
    uniquePurposes.has(purpose),
  );
  if (!hasAllPurposes) {
    return NextResponse.json(
      { ok: false, error: "Missing required image variants." },
      { status: 400 },
    );
  }

  for (const upload of parsed.uploads) {
    const error = validateUploadRequest(upload as ImageUploadRequest);
    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }
  }

  try {
    const uploads = await Promise.all(
      parsed.uploads.map((upload) => createPresignedUpload(userId, upload)),
    );
    return NextResponse.json({ ok: true, uploads });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not create upload URLs." },
      { status: 500 },
    );
  }
}
