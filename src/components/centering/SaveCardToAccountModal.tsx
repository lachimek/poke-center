"use client";

import { useCallback, useState } from "react";
import { saveCardToAccount } from "@/actions/savedCards";
import { btnBase, ModalShell } from "@/components/ui/ModalShell";
import type { CenteringSessionPayload } from "@/lib/centering/sessionPayload";

type SaveCardToAccountModalProps = {
  onClose: () => void;
  payload: CenteringSessionPayload;
};

export function SaveCardToAccountModal({
  onClose,
  payload,
}: SaveCardToAccountModalProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const result = await saveCardToAccount(name, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [name, onClose, payload]);

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
      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}
