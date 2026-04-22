import type { CapturedSide } from "./types";

const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.9;
const OUTPUT_MIME = "image/jpeg";

/**
 * Re-encode a picked image to a sane JPEG of bounded dimensions.
 *
 * Strips EXIF/orientation, clamps the long edge to {@link MAX_EDGE_PX}, and
 * returns both the encoded Blob and a local object URL for preview. Callers
 * own the returned `previewUrl` and must {@link URL.revokeObjectURL} it.
 */
export async function reencodeImage(file: File): Promise<CapturedSide> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const longEdge = Math.max(width, height);
    const scale = longEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longEdge : 1;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2d context.");
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), OUTPUT_MIME, JPEG_QUALITY);
    });
    if (!blob) {
      throw new Error("Could not encode image.");
    }

    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      mimeType: OUTPUT_MIME,
      byteSize: blob.size,
    };
  } finally {
    bitmap.close();
  }
}
