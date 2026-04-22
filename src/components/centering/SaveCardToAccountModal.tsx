"use client";

import { useCallback, useState } from "react";
import { btnBase, ModalShell } from "@/components/ui/ModalShell";
import { dataUrlToBlob } from "@/lib/centering/imageUtils";
import type { CenteringSessionConfiguration } from "@/lib/centering/sessionConfiguration";
import type { CenteringSessionPayload } from "@/lib/centering/sessionPayload";
import { notifyError, notifySuccess } from "@/lib/toast";

type SaveCardToAccountModalProps = {
  onClose: () => void;
  payload: CenteringSessionPayload;
  wipId?: string | null;
  defaultName?: string;
  onSaved?: () => void;
};

type UploadPurpose =
  | "front_raw"
  | "front_processed"
  | "back_raw"
  | "back_processed";

type UploadItem = {
  purpose: UploadPurpose;
  dataUrl: string;
};

type CreateUploadsResponse =
  | {
      ok: true;
      uploads: Array<{
        purpose: UploadPurpose;
        mimeType: string;
        byteSize: number;
        objectKey: string;
        uploadUrl: string;
      }>;
    }
  | { ok: false; error: string };

type FinalizeResponse = { ok: true } | { ok: false; error: string };

function toConfiguration(
  payload: CenteringSessionPayload,
): CenteringSessionConfiguration {
  const { rawImageSrc: _fr, imageSrc: _fi, ...front } = payload.front;
  const { rawImageSrc: _br, imageSrc: _bi, ...back } = payload.back;
  return { v: payload.v, front, back };
}

export function SaveCardToAccountModal({
  onClose,
  payload,
  wipId,
  defaultName,
  onSaved,
}: SaveCardToAccountModalProps) {
  const [name, setName] = useState(defaultName ?? "");
  const [saving, setSaving] = useState(false);

  const safeClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const uploadItems: UploadItem[] = [
        { purpose: "front_raw", dataUrl: payload.front.rawImageSrc ?? "" },
        { purpose: "front_processed", dataUrl: payload.front.imageSrc ?? "" },
        { purpose: "back_raw", dataUrl: payload.back.rawImageSrc ?? "" },
        { purpose: "back_processed", dataUrl: payload.back.imageSrc ?? "" },
      ];
      if (uploadItems.some((item) => !item.dataUrl.startsWith("data:"))) {
        notifyError("Invalid card data. Upload both sides and try again.");
        return;
      }

      const localUploads = uploadItems.map((item) => {
        const { blob, mimeType } = dataUrlToBlob(item.dataUrl);
        return { ...item, blob, mimeType };
      });

      const createRes = await fetch("/api/uploads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploads: localUploads.map((upload) => ({
            purpose: upload.purpose,
            mimeType: upload.mimeType,
            byteSize: upload.blob.size,
          })),
        }),
      });
      const createJson = (await createRes.json()) as CreateUploadsResponse;
      if (!createRes.ok || !createJson.ok) {
        notifyError(
          createJson.ok
            ? "Could not start upload."
            : createJson.error || "Could not start upload.",
        );
        return;
      }

      const byPurpose = new Map(
        createJson.uploads.map((upload) => [upload.purpose, upload]),
      );
      for (const local of localUploads) {
        const signed = byPurpose.get(local.purpose);
        if (!signed) {
          notifyError("Upload session is missing required image variants.");
          return;
        }
        const putRes = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": local.mimeType },
          body: local.blob,
        });
        if (!putRes.ok) {
          notifyError("Image upload failed. Please try again.");
          return;
        }
      }

      const finalizeRes = await fetch("/api/cards/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          configuration: toConfiguration(payload),
          uploads: createJson.uploads.map((upload) => ({
            purpose: upload.purpose,
            objectKey: upload.objectKey,
            mimeType: upload.mimeType,
            byteSize: upload.byteSize,
          })),
          ...(wipId ? { wipId } : {}),
        }),
      });
      const finalizeJson = (await finalizeRes.json()) as FinalizeResponse;
      if (!finalizeRes.ok || !finalizeJson.ok) {
        notifyError(
          finalizeJson.ok
            ? "Could not save. Please try again."
            : finalizeJson.error || "Could not save. Please try again.",
        );
        return;
      }
      notifySuccess(`Saved "${name.trim()}" to your account.`);
      onSaved?.();
      onClose();
    } catch {
      notifyError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, onClose, onSaved, payload, wipId]);

  return (
    <ModalShell
      onClose={safeClose}
      backdropLabel="Close save card dialog"
      title="Save card to your account"
      subtitle="Choose a display name. You can reuse names for different cards."
      dialogClassName="max-w-md"
      zIndex={100}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={safeClose}
            disabled={saving}
            className={`${btnBase} border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className={`${btnBase} border-emerald-500/35 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
        Card name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-emerald-500/30 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-2"
          placeholder="e.g. Charizard base set"
          disabled={saving}
        />
      </label>
    </ModalShell>
  );
}
