import type { CounterItem, CountersConfig } from "@/lib/types";
import { parseISODate, todayISO } from "@/lib/utils";

/** Color por defecto del recuadro de los contadores (se puede cambiar en Ajustes). */
export const DEFAULT_COUNTER_BOX = "#101010";
/** Color por defecto de la letra de los contadores (se puede cambiar en Ajustes). */
export const DEFAULT_COUNTER_TEXT = "#f2f2f2";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysBetween(fromISO: string, toISO: string): number {
  const diff = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(diff / 86400000);
}

/** Parsea la columna settings.counters (JSON) con fallback a la config vacía.
 * Los campos inválidos/ausentes quedan con los valores por defecto. */
export function parseCounters(raw: string | null | undefined): CountersConfig {
  const base: CountersConfig = {
    box: DEFAULT_COUNTER_BOX,
    text: DEFAULT_COUNTER_TEXT,
    items: [],
  };
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<CountersConfig>;
    if (!parsed || typeof parsed !== "object") return base;
    if (isHex(parsed.box)) base.box = parsed.box.toLowerCase();
    if (isHex(parsed.text)) base.text = parsed.text.toLowerCase();
    if (Array.isArray(parsed.items)) {
      base.items = (parsed.items as Partial<CounterItem>[])
        .filter((item) => item && typeof item.id === "string")
        .map((item) => ({
          id: String(item.id),
          name: String(item.name ?? "").slice(0, 12),
          days:
            Number.isFinite(Number(item.days)) && Number(item.days) > 0
              ? Math.floor(Number(item.days))
              : 0,
          limit:
            Number.isFinite(Number(item.limit)) && Number(item.limit) > 0
              ? Math.floor(Number(item.limit))
              : null,
          last_date: isISODate(item.last_date) ? item.last_date : todayISO(),
          resettable: item.resettable === true,
        }));
    }
    return base;
  } catch {
    return base;
  }
}

/** Serializa la config a la forma que se guarda en settings.counters. */
export function stringifyCounters(config: CountersConfig): string {
  return JSON.stringify(config);
}

/** Valor ya calculado de un contador para mostrar en el banner. */
export type CounterView = {
  value: number;
  /** "3" (sin límite) o "3/30" (con límite). */
  display: string;
  /** true cuando tiene límite y ya llegó al tope (se queda ahí y cambia de color). */
  reached: boolean;
};

/** Devuelve el valor del contador para el día `today` (YYYY-MM-DD):
 * days + días transcurridos desde last_date, con piso en 0. Si tiene límite,
 * el tope corta el valor (min) y marca reached. */
export function computeCounterView(
  item: CounterItem,
  today = todayISO()
): CounterView {
  const elapsed = Math.max(0, daysBetween(item.last_date, today));
  let value = item.days + elapsed;
  const reached = item.limit !== null && value >= item.limit;
  if (item.limit !== null) value = Math.min(value, item.limit);
  const display = item.limit !== null ? `${value}/${item.limit}` : String(value);
  return { value, display, reached };
}