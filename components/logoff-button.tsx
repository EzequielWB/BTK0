"use client";

import { logoutAction } from "@/lib/actions";

export function LogoffButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="cyb-link red text-[11px] uppercase tracking-widest"
      >
        Salir
      </button>
    </form>
  );
}