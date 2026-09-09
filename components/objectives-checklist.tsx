"use client";

import { useOptimistic, useTransition } from "react";
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

  function onSet(item: ChecklistItem, status: ChecklistStatus) {
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
      {optimisticItems.map((item) => (
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
          </div>
        </li>
      ))}
    </ul>
  );
}