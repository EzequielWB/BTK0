"use client";

import { useCallback, useEffect, useRef, useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { reorderObjectivesAction, setDailyObjectiveStatusAction } from "@/lib/actions";
import { ClampText } from "@/components/clamp-text";
import type { ChecklistItem, ChecklistStatus } from "@/lib/types";

const ORDER: ChecklistStatus[] = ["none", "partial", "done"];
const HOLD_MS = 250;

export function ObjectivesChecklist({
  date,
  items,
}: {
  date: string;
  items: ChecklistItem[];
}) {
  const router = useRouter();
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

  // Drag & drop: mantener apretado el grip ⋮⋮, mover y soltar.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<ChecklistItem[] | null>(null);
  const holdTimer = useRef<number | null>(null);
  const press = useRef<{ el: HTMLElement | null; pointerId: number } | null>(null);
  const draggingIdRef = useRef<string | null>(null);

  function clearHold() {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    };
  }, []);

  function onGripDown(e: React.PointerEvent, objectiveId: string) {
    if (dragOrder || draggingIdRef.current) return;
    press.current = { el: e.currentTarget as HTMLElement, pointerId: e.pointerId };
    holdTimer.current = window.setTimeout(() => {
      const target = press.current;
      if (!target) return;
      draggingIdRef.current = objectiveId;
      setDraggingId(objectiveId);
      setDragOrder([...optimisticItems]);
      try {
        target.el?.setPointerCapture(target.pointerId);
      } catch {
        /* sin captura, se tolera */
      }
    }, HOLD_MS);
  }

  function onGripMove(e: React.PointerEvent) {
    if (!dragOrder || !draggingIdRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const row = el?.closest?.("[data-obj-id]") as HTMLElement | null;
    const overId = row?.dataset.objId ?? null;
    if (!overId || overId === draggingIdRef.current) return;

    setDragOrder((prev) => {
      if (!prev) return prev;
      const from = prev.findIndex((i) => i.objectiveId === draggingIdRef.current);
      const to = prev.findIndex((i) => i.objectiveId === overId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onGripUp() {
    if (press.current?.el) {
      try {
        press.current.el.releasePointerCapture(press.current.pointerId);
      } catch {
        /* sin captura */
      }
    }
    if (draggingIdRef.current) {
      setDraggingId(null);
      clearHold();
      press.current = null;
      const ids = dragOrder?.map((item) => item.objectiveId) ?? [];
      draggingIdRef.current = null;
      if (ids.length >= 2) {
        startTransition(async () => {
          const res = await reorderObjectivesAction(ids);
          if (res?.error) router.refresh();
          setDragOrder(null);
        });
      } else {
        setDragOrder(null);
      }
      return;
    }
    clearHold();
    press.current = null;
  }

  function onGripCancel() {
    clearHold();
    press.current = null;
    setDraggingId(null);
    draggingIdRef.current = null;
    setDragOrder(null);
  }

  const onSet = useCallback(
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
    },
    [date, setOptimistic]
  );

  const visible = dragOrder ?? optimisticItems;

  if (visible.length === 0 && !dragOrder) {
    return (
      <p className="cyb-hint text-sm">
        Todavía no hay objetivos definidos. Andá a Ajustes para crearlos.
      </p>
    );
  }

  const dragging = dragOrder !== null;

  return (
    <ul className={"space-y-2" + (dragging ? " select-none" : "")}>
      {visible.map((item) => {
        const isDragging = item.objectiveId === draggingId;

        if (item.status === "ignored") {
          return (
            <li
              key={item.objectiveId}
              data-obj-id={item.objectiveId}
              className={"opacity-50" + (isDragging ? " cyb-dragging" : "")}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="cyb-grip"
                    role="button"
                    tabIndex={0}
                    aria-label="Mantener y arrastrar para reordenar"
                    title="Mantener y arrastrar para ordenar"
                    onPointerDown={(e) => onGripDown(e, item.objectiveId)}
                    onPointerMove={onGripMove}
                    onPointerUp={onGripUp}
                    onPointerCancel={onGripCancel}
                  >
                    ⋮⋮
                  </span>
                  <div className="min-w-0">
                    <span className="line-through">{item.title}</span>
                    {item.description ? (
                      <ClampText text={item.description} className="text-sm cyb-hint" />
                    ) : null}
                  </div>
                </div>
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
          <li
            key={item.objectiveId}
            data-obj-id={item.objectiveId}
            className={isDragging ? "cyb-dragging" : ""}
          >
            <div className="flex items-start gap-2">
              <span
                className="cyb-grip"
                role="button"
                tabIndex={0}
                aria-label="Mantener y arrastrar para reordenar"
                title="Mantener y arrastrar para ordenar"
                onPointerDown={(e) => onGripDown(e, item.objectiveId)}
                onPointerMove={onGripMove}
                onPointerUp={onGripUp}
                onPointerCancel={onGripCancel}
              >
                ⋮⋮
              </span>
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
              <div className="min-w-0">
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
                  <ClampText text={item.description} className="text-sm cyb-hint" />
                ) : null}
              </div>
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