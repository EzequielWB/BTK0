"use client";

import { useState, useTransition } from "react";
import { useOptimistic } from "react";
import type { ActionResult } from "@/lib/actions";
import { ClampText } from "@/components/clamp-text";

export type EntryItem = {
  id: string;
  created_at: string;
  content: string;
};

type EntryAction =
  | { type: "add"; entry: EntryItem }
  | { type: "delete"; id: string };

type Message =
  | { kind: "ok"; text: string }
  | { kind: "error"; text: string };

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function DailyEntriesEditor({
  title,
  emptyText,
  placeholder,
  addLabel,
  pendingAddLabel,
  okMessage,
  initialEntries,
  add,
  remove,
}: {
  title: string;
  emptyText: string;
  placeholder: string;
  addLabel: string;
  pendingAddLabel: string;
  okMessage: string;
  initialEntries: EntryItem[];
  add: (content: string, id: string) => Promise<ActionResult>;
  remove: (id: string) => Promise<ActionResult>;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  const [optimisticEntries, mutateEntries] = useOptimistic(
    initialEntries,
    (state, action: EntryAction) => {
      if (action.type === "add") return [...state, action.entry];
      return state.filter((entry) => entry.id !== action.id);
    }
  );

  function handleAdd() {
    const content = value.trim();
    if (!content || pending) return;
    const id = crypto.randomUUID();
    setMessage(null);
    setValue("");
    startTransition(async () => {
      mutateEntries({
        type: "add",
        entry: {
          id,
          content,
          created_at: new Date().toISOString(),
        },
      });
      const result = await add(content, id);
      setMessage(
        result?.error
          ? { kind: "error", text: result.error }
          : { kind: "ok", text: okMessage }
      );
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      mutateEntries({ type: "delete", id });
      const result = await remove(id);
      if (result?.error) setMessage({ kind: "error", text: result.error });
    });
  }

  return (
    <section>
      <h2 className="blk-tag">
        {title}{" "}
        {optimisticEntries.length > 0 && (
          <span className="text-xs font-normal opacity-80">
            ({optimisticEntries.length})
          </span>
        )}
      </h2>

      {optimisticEntries.length === 0 ? (
        <p className="cyb-hint text-sm mb-3">{emptyText}</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {optimisticEntries.map((entry) => (
            <li key={entry.id} className="enrow">
              <ClampText text={entry.content} className="whitespace-pre-wrap" />
              <div className="flex items-center justify-between mt-2">
                <time className="cyb-hint text-xs">
                  {formatTime(entry.created_at)}
                </time>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  disabled={pending}
                  className="cyb-link red disabled:opacity-40"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setMessage(null);
        }}
        placeholder={placeholder}
        rows={3}
        className="cyb-in resize-y"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!value.trim() || pending}
          className="cyb-btn disabled:opacity-40"
        >
          {pending ? pendingAddLabel : addLabel}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.kind === "error" ? "text-[var(--cyb-g1)]" : "cyb-muted"
            }`}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </span>
        )}
      </div>
    </section>
  );
}