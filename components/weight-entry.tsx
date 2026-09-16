"use client";

import { useState, useTransition } from "react";
import { deleteWeightAction, saveWeightAction } from "@/lib/actions";
import { formatShortDate, todayISO } from "@/lib/utils";
import { kilogramLabel } from "@/lib/weight";

type Feedback = { kind: "error" | "success"; text: string } | null;

export function WeightEntry({
  monthStart,
  monthEnd,
  existing,
}: {
  monthStart: string;
  monthEnd: string;
  /** Map date → kg de los días ya registrados en el mes que se está viendo. */
  existing: Record<string, number>;
}) {
  const today = todayISO();
  const maxDate = monthEnd < today ? monthEnd : today;

  const [date, setDate] = useState(today);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, startTransition] = useTransition();

  const current = existing[date];

  function handleDateChange(next: string) {
    setDate(next);
    setFeedback(null);
    const saved = existing[next];
    setValue(saved !== undefined ? String(saved) : "");
  }

  function handleValueChange(next: string) {
    setValue(next);
    setFeedback(null);
  }

  function save() {
    setFeedback(null);
    if (!value.trim()) {
      setFeedback({ kind: "error", text: "Escribí el peso de este día." });
      return;
    }
    startTransition(async () => {
      const result = await saveWeightAction(date, value);
      if (result?.error) {
        setFeedback({ kind: "error", text: result.error });
      } else {
        setValue("");
        setFeedback({
          kind: "success",
          text: `Peso de ${formatShortDate(date)} guardado.`,
        });
      }
    });
  }

  function remove() {
    if (!window.confirm(`¿Borrar el peso de ${formatShortDate(date)}?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteWeightAction(date);
      if (result?.error) {
        setFeedback({ kind: "error", text: result.error });
      } else {
        setValue("");
        setFeedback({ kind: "success", text: "Peso eliminado." });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="cyb-muted flex flex-col gap-1 text-xs">
          Fecha
          <input
            type="date"
            value={date}
            min={monthStart}
            max={maxDate}
            onChange={(event) => handleDateChange(event.target.value)}
            className="cyb-campo-sm"
            aria-label="Fecha del peso"
          />
        </label>
        <label className="cyb-muted flex flex-col gap-1 text-xs">
          Peso (kg)
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => handleValueChange(event.target.value)}
            placeholder="84,5"
            className="cyb-campo-sm"
            aria-label="Peso en kilogramos"
          />
        </label>
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending}
          className="cyb-btn small disabled:opacity-40"
        >
          {current !== undefined ? "Actualizar" : "Guardar"}
        </button>
        {current !== undefined && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={pending}
            className="cyb-btn small disabled:opacity-40"
          >
            Borrar
          </button>
        )}
      </div>

      {current !== undefined && (
        <p className="cyb-hint text-xs">
          {formatShortDate(date)} · {kilogramLabel(current)} ya registrado
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className={
            feedback.kind === "error"
              ? "text-xs text-[var(--cyb-g1)]"
              : "text-xs text-[var(--cyb-green)]"
          }
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}