"use client";

import { useEffect, useState } from "react";

export function OsdFrame() {
  const [now, setNow] = useState("00:00:00");

  useEffect(() => {
    function fmt(d: Date) {
      return [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
    }
    const id = window.setInterval(() => setNow(fmt(new Date())), 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--cyb-mut)] sm:text-[11px]">
        <div className="flex items-center justify-between border-b border-[var(--cyb-lines)] pb-2">
          <span>Acceso restringido</span>
          <span className="flex items-center gap-2">
            <span className="dot-live h-1.5 w-1.5 rounded-full bg-red-600" />
            <span>LIVE</span>
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--cyb-lines)] pt-2">
          <span>Bitákora OS v0.1</span>
          <span className="osd-clock text-[var(--cyb-dim)]">#{now}</span>
        </div>
      </div>
      <div aria-hidden className="login-scanlines pointer-events-none fixed inset-0 z-[60]" />
      <div aria-hidden className="login-vignette pointer-events-none fixed inset-0 z-[40]" />
    </>
  );
}