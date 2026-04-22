import { redirect } from "next/navigation";
import { MobileCaptureApp } from "@/components/capture/MobileCaptureApp";
import { getSession } from "@/lib/auth";

export default async function MobileCapturePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/");
  }

  return <MobileCaptureApp />;
}
