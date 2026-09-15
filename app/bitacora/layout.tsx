import type { ReactNode } from "react";
import Link from "next/link";
import { CybClock } from "@/components/cyb-clock";
import { LogoffButton } from "@/components/logoff-button";
import { ReminderFab } from "@/components/reminder-fab";
import { colorsToStyleVars, parseColors } from "@/lib/colors";
import { createClient, isLocalMode } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BitacoraLayout({ children }: { children: ReactNode }) {
  const local = isLocalMode();

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
    <div
      className="cyb-shell flex min-h-full flex-col"
      style={colorsToStyleVars(colors)}
    >
      <header className="cyb-deck">
        <Link href="/bitacora" className="cyb-logo no-underline">
          BitAK0R4_
        </Link>
        <CybClock />
        <span className="cyb-tags">
          <span>
            <i className="led" />
            SYS.OK
          </span>
          <span>
            <i className="led amber" />
            {local ? "LOCAL" : "SUPA"}
          </span>
          <span>
            <i className="led red" />
            {local ? "NO-DB" : "SYNC"}
          </span>
        </span>
        <nav className="cyb-nav">
          <Link href="/bitacora">Hoy</Link>
          <Link href="/bitacora/buscar">Buscar</Link>
          <Link href="/bitacora/agenda">Cuaderno</Link>
          <Link href="/bitacora/efemerides">Efemérides</Link>
          <Link href="/bitacora/settings">Ajustes</Link>
          <Link href="/bitacora/stats">Stats</Link>
          <LogoffButton />
        </nav>
      </header>

      <main className="flex-1">
        <div className="cyb-stage">{children}</div>
      </main>

      <ReminderFab />
    </div>
  );
}