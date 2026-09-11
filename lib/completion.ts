import type { ChecklistStatus, CompletionMode, Settings } from "@/lib/types";

// Compatibilidad con datos viejos: filas pre-FASE 11 guardaban "completed".
export function statusOf(entry: {
  status?: string;
  completed?: boolean;
}): ChecklistStatus {
  if (
    entry.status === "none" ||
    entry.status === "partial" ||
    entry.status === "done" ||
    entry.status === "ignored"
  ) {
    return entry.status;
  }
  return entry.completed ? "done" : "none";
}

// Valor de cada estado para la "Compleción": ✕ = 0, − = 0.5, ✓ = 1.
// "ignored" no cuenta ni a favor ni en contra (excluye el objetivo del día).
export function statusValue(status: ChecklistStatus): number {
  if (status === "done") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

export function dayScore(
  items: { status: ChecklistStatus }[]
): number {
  return items.reduce((sum, item) => sum + statusValue(item.status), 0);
}

// Ítems que entran en la cuenta del día (los ignorados quedan afuera del
// numerador y del denominador).
export function countedItems(items: { status: ChecklistStatus }[]): {
  status: ChecklistStatus;
}[] {
  return items.filter((item) => item.status !== "ignored");
}

export function dayPercent(items: { status: ChecklistStatus }[]): number {
  const counted = countedItems(items);
  if (counted.length <= 0) return 0;
  return Math.round((dayScore(counted) / counted.length) * 100);
}

export type CompletionConfig = {
  mode: CompletionMode;
  threshold: number;
};

export function defaultCompletionConfig(): CompletionConfig {
  return { mode: "off", threshold: 1 };
}

export function completionConfigFromRow(
  row: Pick<Settings, "completion_mode" | "threshold"> | null
): CompletionConfig {
  if (!row) return defaultCompletionConfig();
  return {
    mode: row.completion_mode,
    threshold: Math.max(1, row.threshold),
  };
}

// El día se considera cumplido con TODOS los estados sumando: una "−" (a
// medias) aporta 0.5, un "✓" aporta 1. Modo "count" compara puntos contra el
// umbral; modo "percent" compara el % (puntos/total).
export function isDayFulfilled(
  config: CompletionConfig,
  totalObjectives: number,
  points: number
): boolean {
  if (config.mode === "off" || totalObjectives <= 0) return false;
  if (config.mode === "count") {
    return points >= config.threshold;
  }
  const percent = Math.round((points / totalObjectives) * 100);
  return percent >= Math.min(100, config.threshold);
}