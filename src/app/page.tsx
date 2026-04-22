import { Suspense } from "react";
import { CenteringApp } from "@/components/centering/CenteringApp";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-8">
        <Suspense fallback={null}>
          <CenteringApp />
        </Suspense>
      </div>
    </div>
  );
}
