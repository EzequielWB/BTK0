"use client";

import { useMemo, useState, useTransition } from "react";
import { reorderDaySectionsAction } from "@/lib/actions";
import {
  DAY_SECTION_LABELS,
  DEFAULT_DAY_SECTION_ORDER,
  parseDaySectionOrder,
  type DaySectionKey,
} from "@/lib/sections";

export function DaySectionsOrder({
  sectionOrder,
}: {
  sectionOrder: string | null | undefined;
}) {
  const base = useMemo(() => parseDaySectionOrder(sectionOrder), [sectionOrder]);
  const [movedIds, setMovedIds] = useState<DaySectionKey[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const order = movedIds ?? base;

  function move(index: number, direction: -1 | 1) {
    const to = index + direction;
    if (index < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    [next[index], next[to]] = [next[to], next[index]];

    setMovedIds(next);
    setMessage(null);
    startTransition(async () => {
      const res = await reorderDaySectionsAction(next);
      if (res?.error) setMessage(res.error);
      setMovedIds(null);
    });
  }

  function reset() {
    startTransition(async () => {
      const res = await reorderDaySectionsAction([
        ...DEFAULT_DAY_SECTION_ORDER,
      ]);
      if (res?.success) {
        setMessage(res.success);
        setMovedIds([...DEFAULT_DAY_SECTION_ORDER]);
      } else if (res?.error) {
        setMessage(res.error);
      }
    });
  }

  return (
    <section className="blk">
      <h2 className="blk-tag">Orden_de_la_bitácora</h2>
      <p className="cyb-muted text-sm mb-3">
        Acomodá el orden de las tarjetas en la vista del día. El calendario
        (agenda) siempre queda arriba.
      </p>

      <ul className="space-y-2">
        {order.map((key, index) => (
          <li key={key} className="enrow flex items-center justify-between gap-2">
            <span className="min-w-0">{DAY_SECTION_LABELS[key]}</span>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={`Subir ${DAY_SECTION_LABELS[key]}`}
                title="Subir"
                className="cyb-link"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
                aria-label={`Bajar ${DAY_SECTION_LABELS[key]}`}
                title="Bajar"
                className="cyb-link"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button type="button" onClick={reset} className="cyb-link">
          ↺ Restablecer orden por defecto
        </button>
        {message ? (
          <span
            className={`text-sm ${
              message.includes("actualizado") ? "text-[var(--cyb-green)]" : "text-[var(--cyb-g1)]"
            }`}
          >
            {message}
          </span>
        ) : null}
      </div>
    </section>
  );
}