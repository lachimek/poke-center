"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ModalShell } from "@/components/ui/ModalShell";
import { notifySuccess } from "@/lib/toast";

type LoginModalProps = {
  onClose: () => void;
  onSwitchToRegister: () => void;
};

export function LoginModal({ onClose, onSwitchToRegister }: LoginModalProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    notifySuccess("Signed in.");
    onClose();
    router.refresh();
  }

  return (
    <ModalShell
      onClose={onClose}
      backdropLabel="Close sign-in"
      title="Sign in"
      subtitle="Welcome back to PokeCentering"
      dialogClassName="max-w-sm"
      footer={
        <p className="text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-zinc-100 underline hover:text-white"
          >
            Register
          </button>
        </p>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Email
          </label>
          <input
            id="login-email"
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
            htmlFor="login-password"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </ModalShell>
  );
}
