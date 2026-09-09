import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/session";
import { isLocalMode } from "@/lib/supabase/server";
import { LoginScreen } from "@/components/login/login-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isAuthenticated()) {
    redirect("/bitacora");
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-black p-4">
      <LoginScreen showDefaultHint={isLocalMode()} />
    </main>
  );
}