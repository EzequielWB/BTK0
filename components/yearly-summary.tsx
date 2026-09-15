"use client";

import { useState } from "react";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; text: string }
  | { phase: "error"; message: string };

export function YearlySummary({ anio }: { anio: string }) {
  const [state, setState] = useState<State>({ phase: "idle" });

  async function run() {
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/yearly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: Number(anio) }),
      });
      const body = (await res.json().catch(() => null)) as
        | { text?: string; error?: string }
        | null;
      if (!body) {
        setState({
          phase: "error",
          message: "No se pudo consultar el análisis. Probá de nuevo.",
        });
        return;
      }
      if (typeof body.error === "string" && body.error.length > 0) {
        setState({ phase: "error", message: body.error });
        return;
      }
      setState({ phase: "done", text: body.text ?? "" });
    } catch {
      setState({
        phase: "error",
        message: "No se pudo consultar el análisis. Probá de nuevo.",
      });
    }
  }

  return (
    <div className="mt-4 border-t border-cyb-lines pt-4">
      <button
        type="button"
        onClick={run}
        disabled={state.phase === "loading"}
        className="cyb-btn disabled:opacity-40"
      >
        {state.phase === "loading"
          ? "Analizando el año..."
          : "¿Cómo va el año?"}
      </button>

      {state.phase === "loading" ? (
        <p className="cyb-hint text-sm mt-3" role="status">
          Consultando los registros y generando el resumen…
        </p>
      ) : null}

      {state.phase === "done" || state.phase === "error" ? (
        <div className="cyb-month-summary blk mt-4">
          <h3 className="blk-tag">Análisis de la IA</h3>
          {state.phase === "done" ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {state.text}
            </p>
          ) : (
            <p className="text-sm text-[var(--cyb-g1)]" role="status">
              {state.message}
            </p>
          )}
          <button
            type="button"
            onClick={run}
            className="cyb-btn small mt-3"
          >
            {state.phase === "done" ? "Regenerar" : "Reintentar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}