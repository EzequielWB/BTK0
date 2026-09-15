"use client";

import { useState, useTransition } from "react";
import { useOptimistic } from "react";
import {
  createDayGoalAction,
  deleteDayGoalAction,
  toggleDayGoalCompleteAction,
  updateDayGoalAction,
} from "@/lib/actions";
import { todayISO } from "@/lib/utils";
import type { DayGoal } from "@/lib/types";

type Message = { kind: "ok" | "error"; text: string };

export function DayGoals({
  date,
  initialGoals,
}: {
  date: string;
  initialGoals: DayGoal[];
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const isPast = date < todayISO();

  const [optimistic, mutate] = useOptimistic(
    initialGoals,
    (
      state: DayGoal[],
      action:
        | { type: "add"; goal: DayGoal }
        | { type: "update"; goal: DayGoal }
        | { type: "toggle"; goal: DayGoal; completed: boolean }
        | { type: "delete"; goal: DayGoal }
    ) => {
      if (action.type === "add") return [...state, action.goal];
      if (action.type === "toggle")
        return state.map((g) =>
          g.id === action.goal.id
            ? {
                ...g,
                completed_at: action.completed
                  ? new Date().toISOString()
                  : null,
              }
            : g
        );
      if (action.type === "update")
        return state.map((g) => (g.id === action.goal.id ? action.goal : g));
      return state.filter((g) => g.id !== action.goal.id);
    }
  );

  const doneCount = optimistic.filter((g) => Boolean(g.completed_at)).length;

  function handleAdd() {
    if (pending) return;
    const title = value.trim();
    if (!title) {
      setMessage({ kind: "error", text: "Escribí el objetivo del día." });
      return;
    }
    const id = crypto.randomUUID();
    setValue("");
    setMessage(null);
    startTransition(async () => {
      mutate({
        type: "add",
        goal: { id, date, title, created_at: new Date().toISOString() },
      });
      const result = await createDayGoalAction(date, title, id);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Objetivo del día agregado." }
      );
    });
  }

  function handleSaveEdit(goal: DayGoal) {
    if (pending) return;
    const title = editValue.trim();
    if (!title) {
      setMessage({ kind: "error", text: "Escribí el objetivo del día." });
      return;
    }
    setEditingId(null);
    startTransition(async () => {
      mutate({ type: "update", goal: { ...goal, title } });
      const result = await updateDayGoalAction(goal.id, title, goal.date);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Objetivo del día actualizado." }
      );
    });
  }

  function handleDelete(goal: DayGoal) {
    startTransition(async () => {
      mutate({ type: "delete", goal });
      const result = await deleteDayGoalAction(goal.id, goal.date);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleToggle(goal: DayGoal) {
    if (pending) return;
    const completed = !(goal.completed_at ?? null);
    startTransition(async () => {
      mutate({ type: "toggle", goal, completed });
      const result = await toggleDayGoalCompleteAction(
        goal.id,
        goal.date,
        completed
      );
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  return (
    <div className="space-y-3">
      {optimistic.length === 0 ? (
        <p className="cyb-hint text-sm">
          No hay objetivos para este día. Agregá uno para este día.
        </p>
      ) : (
        <ul className="space-y-2">
          {optimistic.map((goal) => {
            const done = Boolean(goal.completed_at);
            return (
              <li key={goal.id} className="enrow">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(goal)}
                    disabled={pending}
                    aria-label={
                      done
                        ? "Desmarcar como pendiente"
                        : "Marcar objetivo del día como completado"
                    }
                    title={done ? "Desmarcar" : "Completar"}
                    className={`cyb-goal-tick${done ? " done" : ""}`}
                  >
                    {done ? "✓" : ""}
                  </button>

                  <div className="min-w-0 flex-1">
                    {editingId === goal.id ? (
                      <input
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleSaveEdit(goal);
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        aria-label="Editar objetivo del día"
                        className="cyb-in w-full"
                      />
                    ) : (
                      <>
                        <span
                          className={
                            done ? "cyb-muted line-through" : "break-words"
                          }
                        >
                          {goal.title}
                        </span>
                        {!done && (
                          <span
                            className={
                              "cyb-hint text-xs block" +
                              (isPast ? " text-[var(--cyb-amber)]" : "")
                            }
                          >
                            {isPast ? "quedó pendiente" : "pendiente"}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <span className="shrink-0 text-xs">
                    {editingId === goal.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(goal)}
                          disabled={pending}
                          className="cyb-link disabled:opacity-40"
                        >
                          Guardar
                        </button>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="cyb-link"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(goal.id);
                            setEditValue(goal.title);
                          }}
                          disabled={pending}
                          className="cyb-link disabled:opacity-40"
                        >
                          Editar
                        </button>
                        <span className="mx-2 opacity-30">|</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(goal)}
                          disabled={pending}
                          className="cyb-link red disabled:opacity-40"
                        >
                          Borrar
                        </button>
                      </>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-3 border-t">
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setMessage(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
          placeholder="Objetivo de este día..."
          aria-label="Nuevo objetivo del día"
          className="cyb-in w-full"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!value.trim() || pending}
            className="cyb-btn disabled:opacity-40"
          >
            {pending ? "Guardando..." : "Agregar objetivo"}
          </button>
          {optimistic.length > 0 && (
            <span className="cyb-hint text-xs">
              {doneCount}/{optimistic.length} completados
            </span>
          )}
          {message && (
            <span
              role="status"
              aria-live="polite"
              className={`text-sm ${
                message.kind === "error" ? "text-[var(--cyb-g1)]" : "cyb-muted"
              }`}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}