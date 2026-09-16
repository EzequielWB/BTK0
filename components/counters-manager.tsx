"use client";

import { useActionState, useState } from "react";
import { saveCountersAction } from "@/lib/actions";
import { computeCounterView, parseCounters } from "@/lib/counters";
import { todayISO } from "@/lib/utils";
import type { CounterItem, CountersConfig } from "@/lib/types";

function emptyItem(): CounterItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    days: 0,
    limit: null,
    last_date: todayISO(),
    resettable: false,
  };
}

export function CountersManager({ counters }: { counters: string | null }) {
  const [state, formAction, pending] = useActionState(saveCountersAction, {});
  const [config, setConfig] = useState<CountersConfig>(() =>
    parseCounters(counters)
  );
  const today = todayISO();

  const setBox = (value: string) => setConfig((prev) => ({ ...prev, box: value }));
  const setText = (value: string) => setConfig((prev) => ({ ...prev, text: value }));

  const updateItem = (id: string, patch: Partial<CounterItem>) =>
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));

  const addItem = () =>
    setConfig((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (id: string) =>
    setConfig((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));

  const moveItem = (id: string, direction: -1 | 1) =>
    setConfig((prev) => {
      const items = [...prev.items];
      const from = items.findIndex((i) => i.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return prev;
      [items[from], items[to]] = [items[to], items[from]];
      return { ...prev, items };
    });

  const renderBadge = (item: CounterItem) => {
    const { display, reached } = computeCounterView(item, today);
    return (
      <span
        className={"cyb-count" + (reached ? " reached" : "")}
        style={
          reached ? undefined : { background: config.box, color: config.text }
        }
      >
        <i>{item.name || "---"}</i>
        <b>{display}</b>
        {item.resettable ? (
          <span className="cyb-count-btn" aria-hidden>
            ↺
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <section className="blk">
      <h2 className="blk-tag">Contadores_del_banner</h2>
      <p className="cyb-muted text-sm mb-3">
        Recuadros con siglas y un número que suma 1 por día, junto al tag SYNC
        en el header. El número se fija a mano y la app lo incrementa solo.
      </p>

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="color"
              name="box"
              value={config.box}
              onChange={(event) => setBox(event.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer bg-transparent border border-[var(--cyb-num)] p-0"
            />
            <span className="leading-tight">
              <span className="block text-xs">Recuadro</span>
              <span className="block text-[10px] cyb-hint">Fondo del recuadro</span>
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="color"
              name="text"
              value={config.text}
              onChange={(event) => setText(event.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer bg-transparent border border-[var(--cyb-num)] p-0"
            />
            <span className="leading-tight">
              <span className="block text-xs">Letra</span>
              <span className="block text-[10px] cyb-hint">Color del texto</span>
            </span>
          </label>
        </div>

        {config.items.length > 0 ? (
          <div className="chip-row" aria-label="Vista previa">
            {config.items.map((item) => renderBadge(item))}
          </div>
        ) : null}

        <div className="space-y-2">
          {config.items.map((item, index) => (
            <div
              key={item.id}
              className="enrow space-y-2 border border-[var(--cyb-blk)]"
            >
              <input type="hidden" name={`item_id_${index}`} value={item.id} />

              <div className="flex items-center gap-1">
                {renderBadge(item)}
                <div className="ml-auto flex gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(item.id, -1)}
                    aria-label="Subir en el orden"
                    title="Subir"
                    className="cyb-link"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === config.items.length - 1}
                    onClick={() => moveItem(item.id, 1)}
                    aria-label="Bajar en el orden"
                    title="Bajar"
                    className="cyb-link"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="cyb-link red"
                  >
                    Borrar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="cyb-hint text-sm block mb-1">Siglas (nombre)</span>
                  <input
                    name={`item_name_${index}`}
                    value={item.name}
                    onChange={(event) =>
                      updateItem(item.id, { name: event.target.value })
                    }
                    placeholder="Ej: NFP"
                    className="cyb-in"
                  />
                </label>
                <label className="block">
                  <span className="cyb-hint text-sm block mb-1">Días</span>
                  <input
                    type="number"
                    name={`item_days_${index}`}
                    min={0}
                    value={item.days}
                    onChange={(event) =>
                      updateItem(item.id, { days: Number(event.target.value) })
                    }
                    className="cyb-in"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={item.limit !== null}
                    onChange={(event) =>
                      updateItem(item.id, {
                        limit: event.target.checked ? 30 : null,
                      })
                    }
                    className="cyb-chk"
                  />
                  <span className="cyb-hint text-sm">Tiene límite</span>
                </label>
                {item.limit !== null ? (
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="number"
                      name={`item_limit_${index}`}
                      min={1}
                      value={item.limit}
                      onChange={(event) =>
                        updateItem(item.id, { limit: Number(event.target.value) })
                      }
                      className="cyb-campo-sm"
                    />
                    <span className="cyb-hint text-sm">días (tope)</span>
                  </label>
                ) : null}
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name={`item_resettable_${index}`}
                    checked={item.resettable}
                    onChange={(event) =>
                      updateItem(item.id, { resettable: event.target.checked })
                    }
                    className="cyb-chk"
                  />
                  <span className="cyb-hint text-sm">Reiniciar a 0 (↺)</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addItem}
            disabled={config.items.length >= 12}
            className="cyb-btn small"
          >
            + Agregar contador
          </button>
          <button type="submit" disabled={pending} className="cyb-btn">
            {pending ? "Guardando..." : "Guardar contadores"}
          </button>
          {state.error ? (
            <p className="text-sm text-[var(--cyb-g1)]">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-[var(--cyb-green)]">{state.success}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}