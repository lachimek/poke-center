import { CenteringApp } from "@/components/centering/CenteringApp";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#070708] text-zinc-200">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="font-mono text-lg font-semibold tracking-tight text-zinc-100">
              PokéCentering
            </h1>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
              Manual TCG centering calculator
            </p>
          </div>
          <div className="hidden text-right font-mono text-[10px] text-zinc-600 sm:block">
            <div>Logical space 630x880</div>
            <div>Ratio 63:88</div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1560px] flex-1 px-6 py-8">
        <CenteringApp />
      </main>
    </div>
  );
}
