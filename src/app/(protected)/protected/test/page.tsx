import { redirect } from "next/navigation";
import SignOutButton from "@/components/ui/SignOutButton";
import { getSession } from "@/lib/auth";

export default async function ProtectedTestPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Protected Page</h1>
          <p className="mt-1 text-sm text-zinc-400">
            If you can see this, authentication is working.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-3">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Email
            </span>
            <p className="text-sm text-zinc-200">{session.user.email}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              User ID
            </span>
            <p className="text-sm font-mono text-zinc-200">{session.user.id}</p>
          </div>
        </div>

        <SignOutButton />
      </div>
    </div>
  );
}
