import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  DETECT_CORNERS_MAX_BYTES,
  type DetectCornersResponse,
} from "@/lib/centering/detectCornersContract";
import { isAllowedImageMimeType } from "@/lib/storage/imageService";

const CARD_DETECTOR_URL = process.env.CARD_DETECTOR_URL;

function errorResponse(error: string, status: number) {
  return NextResponse.json<DetectCornersResponse>(
    { ok: false, error },
    { status },
  );
}

function toDetectorEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return `${trimmed}/detect-corners`;
}

function toDownstreamErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim())
    return record.error;
  if (typeof record.detail === "string" && record.detail.trim())
    return record.detail;
  return null;
}

export async function POST(req: Request) {
  if (!CARD_DETECTOR_URL) {
    return errorResponse(
      "Server is missing CARD_DETECTOR_URL configuration.",
      500,
    );
  }

  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return errorResponse("You must be signed in.", 401);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorResponse("Invalid form data payload.", 400);
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return errorResponse("Missing image file.", 400);
  }
  if (!isAllowedImageMimeType(file.type)) {
    return errorResponse(
      "Unsupported image type. Allowed: png, jpeg, webp.",
      400,
    );
  }
  if (file.size > DETECT_CORNERS_MAX_BYTES) {
    return errorResponse(
      `Image too large. Max size is ${Math.floor(DETECT_CORNERS_MAX_BYTES / (1024 * 1024))}MB.`,
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const form = new FormData();
    form.append(
      "image",
      new File([await file.arrayBuffer()], file.name || "upload", {
        type: file.type,
      }),
    );

    const endpoint = toDetectorEndpoint(CARD_DETECTOR_URL);

    const upstream = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    const payload = (await upstream.json().catch(() => null)) as unknown;
    if (!upstream.ok) {
      const message =
        toDownstreamErrorMessage(payload) || "Could not detect corners.";
      if (upstream.status === 422) return errorResponse(message, 422);
      if (upstream.status === 400 || upstream.status === 413) {
        return errorResponse(message, 400);
      }
      if (upstream.status === 415) return errorResponse(message, 400);
      return errorResponse("Card detector service failed.", 502);
    }

    if (!payload || typeof payload !== "object") {
      return errorResponse("Card detector returned an invalid response.", 502);
    }

    const normalized = payload as DetectCornersResponse;
    if (!normalized.ok) {
      return errorResponse(
        normalized.error || "Could not detect corners.",
        422,
      );
    }

    return NextResponse.json<DetectCornersResponse>(normalized);
  } catch {
    return errorResponse(
      "Could not reach card detector service. Check CARD_DETECTOR_URL and service health.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
