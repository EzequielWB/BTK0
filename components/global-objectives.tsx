"use client";

import { useState, useTransition } from "react";
import { completeGlobalObjectiveAction } from "@/lib/actions";
import { ClampText } from "@/components/clamp-text";
import type { GlobalObjective } from "@/lib/types";

/** Objetivos globales pendientes en la vista del día. El check pide
 * confirmación ("¿Seguro?") antes de darlos por completados: no tienen vuelta
 * atrás desde acá, pero siguen visibles en Ajustes. */
export function GlobalObjectives({
  objectives,
}: {
  objectives: GlobalObjective[];
}) {
  const [armedId, setArmedId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = objectives.filter(
    (objective) => !completedIds.includes(objective.id)
  );

  function complete(objective: GlobalObjective) {
    setArmedId(null);
    setMessage(null);
    startTransition(async () => {
      setCompletedIds((ids) => [...ids, objective.id]);
      const result = await completeGlobalObjectiveAction(objective.id, true);
      if (result?.error) {
        setCompletedIds((ids) => ids.filter((id) => id !== objective.id));
        setMessage(result.error);
      }
    });
  }

  if (visible.length === 0) {
    return (
      <p className="cyb-hint text-sm">
        No quedan objetivos globales pendientes. ¡Todos completados!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visible.map((objective) => {
          const armed = armedId === objective.id;
          return (
            <li
              key={objective.id}
              className="enrow flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <strong className="break-words">{objective.title}</strong>
                {objective.description ? (
                  <ClampText
                    text={objective.description}
                    className="cyb-hint text-sm"
                  />
                ) : null}
              </div>
              <span className="ml-auto shrink-0">
                {armed ? (
                  <span className="flex items-center gap-1 text-sm">
                    <span className="cyb-hint">¿Seguro?</span>
                    <button
                      type="button"
                      onClick={() => complete(objective)}
                      disabled={pending}
                      className="cyb-link"
                      aria-label={`Confirmar completar ${objective.title}`}
                    >
                      sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setArmedId(null)}
                      className="cyb-link"
                      aria-label={`Cancelar completar ${objective.title}`}
                    >
                      no
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArmedId(objective.id)}
                    disabled={pending}
                    className="cyb-link"
                    aria-label={`Completar ${objective.title}`}
                    title="Marcar como completado"
                  >
                    ✓ Completar
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {message ? (
        <p role="status" aria-live="polite" className="text-sm text-[var(--cyb-g1)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
