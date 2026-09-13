"use client";

import { useState } from "react";
import {
  getRandomQuote,
  getSpecialQuote,
  quoteForDate,
} from "@/lib/quotes";

const REFRESH_KEY = "bitakora:quote-refresh-count";
// Cada 5 refrescos de frase, aparece sí o sí la de "-Anónimo" (sobre las
// probabilidades normales). El resto de refrescos sigue siendo aleatorio
// como siempre. El contador vive en sessionStorage para sobrevivir a la
// navegación entre días.
const SPECIAL_EVERY = 5;

function readRefreshCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(sessionStorage.getItem(REFRESH_KEY) ?? "0") || 0;
}

export function MotivationalQuote({ date }: { date: string }) {
  const [quote, setQuote] = useState(() => quoteForDate(date));

  function handleRefresh() {
    const count = readRefreshCount() + 1;
    sessionStorage.setItem(REFRESH_KEY, String(count));

    if (count % SPECIAL_EVERY === 0) {
      // Refresco especial: siempre la frase de "-Anónimo".
      setQuote(getSpecialQuote());
      return;
    }

    const current = quote.text;
    let next = getRandomQuote();
    while (next.text === current) {
      next = getRandomQuote();
    }
    setQuote(next);
  }

  const text = `«${quote.text}»`;

  return (
    <blockquote className="blk">
      <span className="blk-tag">Cita_del_día</span>
      <p className="glitch" data-text={text}>
        {text}
      </p>
      <div className="flex items-center justify-between gap-3 mt-2">
        <cite className="cyb-muted text-sm not-italic">
          — {quote.author}
          {quote.role ? `, ${quote.role}` : ""}
        </cite>
        <button
          type="button"
          onClick={handleRefresh}
          className="cyb-link shrink-0"
          aria-label="Mostrar otra frase"
        >
          ↻ Otra frase
        </button>
      </div>
    </blockquote>
  );
}