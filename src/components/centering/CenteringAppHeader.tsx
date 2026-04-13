import { useSession } from "next-auth/react";

type CenteringAppHeaderProps = {
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  persistActionsTitle: string | undefined;
  onExport: () => void;
  exporting: boolean;
  exportError: string | null;
  saveError: string | null;
  onResetAll: () => void;
};
export function CenteringAppHeader({
  onSave,
  canSave,
  saving,
  persistActionsTitle,
  onExport,
  exporting,
  exportError,
  saveError,
  onResetAll,
}: CenteringAppHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/80 px-5 py-5 shadow-2xl shadow-black/20 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
          <div className="h-5 w-5 rounded-md border border-emerald-400/70" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            Manual centering analyzer
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            PokéCentering
          </h1>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!canSave || saving}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            title={persistActionsTitle}
          >
            {saving ? "Saving…" : "Save session"}
          </button>
          <button
            type="button"
            onClick={() => void onExport()}
            disabled={!canSave || exporting}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            title={persistActionsTitle}
          >
            {exporting ? "Preparing…" : "Export"}
          </button>
          <button
            type="button"
            onClick={() => void onResetAll()}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800/80"
          >
            Reset
          </button>
        </div>
        {saveError ? (
          <p className="text-right text-xs text-red-400" role="alert">
            {saveError}
          </p>
        ) : null}
        {exportError ? (
          <p className="text-right text-xs text-red-400" role="alert">
            {exportError}
          </p>
        ) : null}
      </div>
    </header>
  );
}
