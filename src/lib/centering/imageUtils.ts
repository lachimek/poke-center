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
