/** Read a File as a data: URL string. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") {
        reject(new Error("Expected data URL"));
        return;
      }
      resolve(r);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/** Load an HTMLImageElement from a src URL, resolving after decode. */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => {
      void img
        .decode()
        .then(() => resolve(img))
        .catch(() => resolve(img));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/** Convert data URL to Blob and mime type for direct uploads. */
export function dataUrlToBlob(dataUrl: string): {
  blob: Blob;
  mimeType: string;
} {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error("Invalid image data URL.");
  }
  const mimeType = match[1].toLowerCase();
  const payload = atob(match[2]);
  const bytes = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    bytes[i] = payload.charCodeAt(i);
  }
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}
