"use client";

import { useEffect, useState } from "react";

export function CybClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 1000);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";

  return (
    <span className="cyb-clock" aria-label={`Hora ${hh}:${mm}`}>
      {hh}:{mm}:<u>{ss}</u>
    </span>
  );
}