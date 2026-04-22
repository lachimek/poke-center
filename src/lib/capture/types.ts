export type SideKey = "front" | "back";

export type WipUploadPurpose = "front_raw" | "back_raw";

export type CapturedSide = {
  blob: Blob;
  previewUrl: string;
  mimeType: string;
  byteSize: number;
};

export const SIDE_KEYS: readonly SideKey[] = ["front", "back"] as const;

export const SIDE_TO_PURPOSE: Record<SideKey, WipUploadPurpose> = {
  front: "front_raw",
  back: "back_raw",
};
