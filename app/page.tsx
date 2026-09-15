import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/session";
import { createClient, isLocalMode } from "@/lib/supabase/server";
import { colorsToStyleVars, parseColors } from "@/lib/colors";
import { LoginScreen } from "@/components/login/login-screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (await isAuthenticated()) {
    redirect("/bitacora");
  }

  const supabase = await createClient();
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("colors")
    .eq("id", 1)
    .maybeSingle();

  const colors = parseColors(
    (settingsRow as { colors?: string | null } | null)?.colors ?? null
  );

  return (
    <main
      className="relative flex min-h-dvh flex-1 items-center justify-center overflow-x-hidden p-4"
      style={{ ...colorsToStyleVars(colors), backgroundColor: "var(--cyb-bg)" }}
    >
      <LoginScreen showDefaultHint={isLocalMode()} />
    </main>
  );
}