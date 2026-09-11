"use client";

import { useOptimistic, useTransition, useState } from "react";
import { setDailyObjectiveStatusAction } from "@/lib/actions";
import type { ChecklistItem, ChecklistStatus } from "@/lib/types";

const ORDER: ChecklistStatus[] = ["none", "partial", "done"];

export function ObjectivesChecklist({
  date,
  items,
}: {
  date: string;
  items: ChecklistItem[];
}) {
  const [optimisticItems, setOptimistic] = useOptimistic(
    items,
    (state: ChecklistItem[], action: { objectiveId: string; status: ChecklistStatus }) =>
      state.map((item) =>
        item.objectiveId === action.objectiveId
          ? { ...item, status: action.status }
          : item
      )
  );

  const [, startTransition] = useTransition();
  const [armedId, setArmedId] = useState<string | null>(null);

  function onSet(item: ChecklistItem, status: ChecklistStatus) {
    setArmedId(null);
    startTransition(() => {
      setOptimistic({ objectiveId: item.objectiveId, status });
      void setDailyObjectiveStatusAction({
        date,
        objectiveId: item.objectiveId,
        status,
      });
    });
  }

  if (optimisticItems.length === 0) {
    return (
      <p className="cyb-hint text-sm">
        Todavía no hay objetivos definidos. Andá a Ajustes para crearlos.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {optimisticItems.map((item) => {
        if (item.status === "ignored") {
          return (
            <li key={item.objectiveId} className="opacity-50">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="line-through">{item.title}</span>
                  {item.description ? (
                    <span className="block text-sm cyb-hint">{item.description}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => onSet(item, "none")}
                  title="Volver a tener en cuenta este objetivo hoy"
                  className="cyb-link"
                >
                  ignorado · quitar
                </button>
              </div>
            </li>
          );
        }

        const armed = armedId === item.objectiveId;
        return (
          <li key={item.objectiveId}>
            <div className="flex items-start gap-2">
              <div className="cyb-trio" role="group" aria-label="Estado del objetivo">
                {ORDER.map((status) => {
                  const active = item.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={
                        status === "none"
                          ? "Sin hacer"
                          : status === "partial"
                            ? "A medias"
                            : "Completado"
                      }
                      title={
                        status === "none"
                          ? "Sin hacer"
                          : status === "partial"
                            ? "A medias"
                            : "Completado"
                      }
                      onClick={() => onSet(item, status)}
                      className={`cyb-trio-slot tri-${status}${
                        active ? " active" : ""
                      }`}
                    >
                      {active
                        ? status === "none"
                          ? "✕"
                          : status === "partial"
                            ? "−"
                            : "✓"
                        : null}
                    </button>
                  );
                })}
              </div>
              <span>
                <span
                  className={
                    item.status === "done"
                      ? "cyb-muted line-through"
                      : item.status === "partial"
                        ? "opacity-80"
                        : ""
                  }
                >
                  {item.title}
                </span>
                {item.description ? (
                  <span className="block text-sm cyb-hint">{item.description}</span>
                ) : null}
              </span>
              <span className="ml-auto shrink-0">
                {armed ? (
                  <span className="flex items-center gap-1 text-sm">
                    <span className="cyb-hint">¿Seguro?</span>
                    <button
                      type="button"
                      onClick={() => onSet(item, "ignored")}
                      className="cyb-link red"
                      aria-label={`Confirmar ignorar ${item.title} hoy`}
                    >
                      sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setArmedId(null)}
                      className="cyb-link"
                      aria-label="Cancelar ignorar objetivo"
                    >
                      no
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArmedId(item.objectiveId)}
                    className="cyb-link red"
                    title="No contar este objetivo hoy"
                  >
                    ignorar
                  </button>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}