"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/lib/actions";
import type { Settings } from "@/lib/types";

export function CompletionSettingsForm({
  settings,
}: {
  settings: Settings | null;
}) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, {});

  const mode = settings?.completion_mode ?? "off";
  const threshold = settings?.threshold ?? 1;

  return (
    <section className="blk">
      <h2 className="blk-tag">Marcar_días_cumplidos</h2>
      <p className="cyb-muted text-sm mb-3">
        Definí cuándo un día se considera cumplido y se marca con un punto
        verde ácido en el calendario. Cada estado suma puntos por objetivo:
        ✕ = 0, − (a medias) = 0.5 y ✓ = 1.
      </p>

      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className="cyb-hint text-sm block mb-1">Criterio</span>
          <select
            name="mode"
            defaultValue={mode}
            className="cyb-in"
          >
            <option value="off">Desactivado (sin marcado)</option>
            <option value="count">Por puntos alcanzados (a medias aporta 0.5)</option>
            <option value="percent">Por porcentaje alcanzado</option>
          </select>
        </label>

        <label className="block">
          <span className="cyb-hint text-sm block mb-1">
            Valor mínimo (puntos o %)
          </span>
          <input
            type="number"
            name="threshold"
            min={1}
            max={100}
            defaultValue={threshold}
            required
            className="cyb-in"
          />
        </label>

        {state.error ? (
          <p className="text-sm text-[#ff3b5c]">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-[#00ff9d]">{state.success}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="cyb-btn"
        >
          {pending ? "Guardando..." : "Guardar ajustes"}
        </button>
      </form>
    </section>
  );
}