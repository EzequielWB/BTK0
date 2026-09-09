"use client";

import { useState } from "react";
import { getRandomQuote, quoteForDate } from "@/lib/quotes";

export function MotivationalQuote({ date }: { date: string }) {
  const [quote, setQuote] = useState(() => quoteForDate(date));

  function handleRefresh() {
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