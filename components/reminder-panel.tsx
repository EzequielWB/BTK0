"use client";

import { useState, useTransition } from "react";
import { useOptimistic } from "react";
import {
  createReminderAction,
  deleteReminderAction,
  toggleReminderCompleteAction,
  updateReminderAction,
} from "@/lib/actions";
import type { Reminder } from "@/lib/types";
import { formatShortDate, parseShortDate } from "@/lib/utils";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Message = { kind: "ok" | "error"; text: string };

export function ReminderPanel({
  date,
  initialReminders,
}: {
  date?: string;
  initialReminders: Reminder[];
}) {
  const [content, setContent] = useState("");
  const [dayVal, setDayVal] = useState(
    date ? formatShortDate(date).slice(0, 2) : ""
  );
  const [monthVal, setMonthVal] = useState(
    date ? formatShortDate(date).slice(3, 5) : ""
  );
  const [yearVal, setYearVal] = useState(
    date ? formatShortDate(date).slice(6, 8) : ""
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [optimistic, mutate] = useOptimistic(
    initialReminders,
    (
      state: Reminder[],
      action:
        | { type: "add"; reminder: Reminder }
        | { type: "update"; reminder: Reminder }
        | { type: "complete"; reminder: Reminder; completed: boolean }
        | { type: "delete"; reminder: Reminder }
    ) => {
      if (action.type === "add") return [...state, action.reminder];
      if (action.type === "complete")
        return state.map((r) =>
          r.id === action.reminder.id
            ? {
                ...r,
                completed_at: action.completed
                  ? new Date().toISOString()
                  : null,
              }
            : r
        );
      if (action.type === "update")
        return state.map((r) =>
          r.id === action.reminder.id ? action.reminder : r
        );
      return state.filter((r) => r.id !== action.reminder.id);
    }
  );

  function handleAdd() {
    if (pending) return;
    const text = content.trim();
    const iso = parseShortDate(`${dayVal}/${monthVal}/${yearVal}`);
    setMessage(null);
    if (!text) {
      setMessage({ kind: "error", text: "Escribí el recordatorio." });
      return;
    }
    if (!iso) {
      setMessage({ kind: "error", text: "La fecha no es válida. Usá dd/mm/aa." });
      return;
    }
    const id = crypto.randomUUID();
    setContent("");
    startTransition(async () => {
      mutate({
        type: "add",
        reminder: {
          id,
          date: iso,
          content: text,
          created_at: new Date().toISOString(),
        },
      });
      const result = await createReminderAction(iso, text, id);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Recordatorio guardado." }
      );
    });
  }

  function handleSaveEdit(reminder: Reminder) {
    if (pending) return;
    const text = editValue.trim();
    if (!text) {
      setMessage({ kind: "error", text: "El recordatorio está vacío." });
      return;
    }
    const iso = reminder.date;
    setEditingId(null);
    startTransition(async () => {
      mutate({ type: "update", reminder: { ...reminder, content: text } });
      const result = await updateReminderAction(reminder.id, text, iso);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: "Recordatorio actualizado." }
      );
    });
  }

  function handleDelete(reminder: Reminder) {
    startTransition(async () => {
      mutate({ type: "delete", reminder });
      const result = await deleteReminderAction(reminder.id, reminder.date);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  function handleToggleComplete(reminder: Reminder) {
    if (pending) return;
    const completed = !(reminder.completed_at ?? null);
    startTransition(async () => {
      mutate({ type: "complete", reminder, completed });
      const result = await toggleReminderCompleteAction(
        reminder.id,
        reminder.date,
        completed
      );
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  return (
    <div className="space-y-3">
      {optimistic.length === 0 ? (
        <p className="cyb-hint text-sm">
          No hay recordatorios para esta fecha.
        </p>
      ) : (
        <ul className="space-y-2">
          {optimistic.map((reminder) => (
            <li
              key={reminder.id}
              className={reminder.completed_at ? "enrow cyb-rem-done" : "enrow"}
            >
              {editingId === reminder.id ? (
                <textarea
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  rows={2}
                  className="cyb-in resize-y"
                />
              ) : (
                <>
                  <span className="cyb-hint text-xs block">
                    {formatShortDate(reminder.date)} · {formatTime(reminder.created_at)}
                  </span>
                  <p className="whitespace-pre-wrap">{reminder.content}</p>
                </>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs">
                  {editingId === reminder.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(reminder)}
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
                          setEditingId(reminder.id);
                          setEditValue(reminder.content);
                        }}
                        disabled={pending}
                        className="cyb-link disabled:opacity-40"
                      >
                        Editar
                      </button>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(reminder)}
                        disabled={pending}
                        aria-label={
                          reminder.completed_at
                            ? "Desmarcar como pendiente"
                            : "Marcar recordatorio como completo"
                        }
                        className="cyb-link disabled:opacity-40"
                      >
                        {reminder.completed_at ? "Desmarcar" : "✓ Completar"}
                      </button>
                    </>
                  )}
                  <span className="mx-2 opacity-30">|</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(reminder)}
                    disabled={pending}
                    className="cyb-link red disabled:opacity-40"
                  >
                    Borrar
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-3 border-t" aria-label="Nuevo recordatorio">
        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setMessage(null);
          }}
          placeholder="Escribí el recordatorio..."
          rows={2}
          className="cyb-in resize-y"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {!date && (
            <div className="flex items-center gap-1">
              <input
                value={dayVal}
                onChange={(event) => {
                  setDayVal(event.target.value.replace(/\D/g, "").slice(0, 2));
                  setMessage(null);
                }}
                placeholder="día"
                inputMode="numeric"
                maxLength={2}
                aria-label="Día del recordatorio (dd)"
                className="cyb-in w-14"
              />
              <span aria-hidden className="cyb-hint text-xs">/</span>
              <input
                value={monthVal}
                onChange={(event) => {
                  setMonthVal(
                    event.target.value.replace(/\D/g, "").slice(0, 2)
                  );
                  setMessage(null);
                }}
                placeholder="mes"
                inputMode="numeric"
                maxLength={2}
                aria-label="Mes del recordatorio (mm)"
                className="cyb-in w-14"
              />
              <span aria-hidden className="cyb-hint text-xs">/</span>
              <input
                value={yearVal}
                onChange={(event) => {
                  setYearVal(event.target.value.replace(/\D/g, "").slice(0, 2));
                  setMessage(null);
                }}
                placeholder="aa"
                inputMode="numeric"
                maxLength={2}
                aria-label="Año del recordatorio (aa)"
                className="cyb-in w-14"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || (!content.trim() && (date ? false : !(dayVal || monthVal || yearVal)))}
            className="cyb-btn disabled:opacity-40"
          >
            {pending ? "Guardando..." : "Agregar recordatorio"}
          </button>
          {message && (
            <span
              role="status"
              aria-live="polite"
              className={`text-sm ${
                message.kind === "error" ? "text-[#ff3b5c]" : "cyb-muted"
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