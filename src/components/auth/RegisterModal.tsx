"use client";

import { useActionState, useEffect } from "react";
import { type RegisterState, register } from "@/actions/auth";
import { ModalShell } from "@/components/ui/ModalShell";

const initialState: RegisterState = {};

type RegisterModalProps = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

export function RegisterModal({
  onClose,
  onSwitchToLogin,
}: RegisterModalProps) {
  const [state, formAction, pending] = useActionState(register, initialState);

  useEffect(() => {
    if (state.success) {
      onSwitchToLogin();
    }
  }, [state.success, onSwitchToLogin]);

  return (
    <ModalShell
      onClose={onClose}
      backdropLabel="Close registration"
      title="Create account"
      subtitle="Get started with PokeCentering"
      dialogClassName="max-w-sm"
      footer={
        <p className="text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-zinc-100 underline hover:text-white"
          >
            Sign in
          </button>
        </p>
      }
    >
      {state.error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="register-email"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-zinc-500">Minimum 8 characters</p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>
    </ModalShell>
  );
}
