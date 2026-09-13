import type { ReactNode } from "react";
import Link from "next/link";
import { CybClock } from "@/components/cyb-clock";
import { LogoffButton } from "@/components/logoff-button";
import { ReminderFab } from "@/components/reminder-fab";
import { isLocalMode } from "@/lib/supabase/server";

export default function BitacoraLayout({ children }: { children: ReactNode }) {
  const local = isLocalMode();

  return (
    <div className="cyb-shell flex min-h-full flex-col">
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