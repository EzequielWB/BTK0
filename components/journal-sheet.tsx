"use client";

import { useEffect, useRef, useState } from "react";
import { saveJournalAction } from "@/lib/actions";
import { formatShortDate } from "@/lib/utils";

const SOFT_CAP = 20_000;
const SAVE_DELAY_MS = 1500;

type SaveState = "idle" | "editing" | "saving" | "saved" | "error";

function statusLabel(
  status: SaveState,
  lastSaved: string | null
): string {
  switch (status) {
    case "editing":
      return "Editando…";
    case "saving":
      return "Guardando…";
    case "saved":
      return `Guardado · ${lastSaved ?? ""}`;
    case "error":
      return "Error al guardar";
    default:
      return "Sin cambios";
  }
}

export function JournalSheet({
  date,
  initial,
}: {
  date: string;
  initial: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const textRef = useRef(text);
  const dirtyRef = useRef(false);
  const statusRef = useRef<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  async function flush() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    statusRef.current = "saving";
    setStatus("saving");
    const result = await saveJournalAction(date, textRef.current.trim());
    statusRef.current = result?.error ? "error" : "saved";
    setStatus(statusRef.current);
    if (result?.error) {
      dirtyRef.current = true;
    } else {
      setLastSaved(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
  }

  function handleChange(value: string) {
    setText(value);
    dirtyRef.current = true;
    statusRef.current = "editing";
    setStatus("editing");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, SAVE_DELAY_MS);
  }

  function close() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dirtyRef.current) {
      dirtyRef.current = false;
      void saveJournalAction(date, textRef.current.trim());
    }
    setOpen(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void saveJournalAction(date, textRef.current.trim());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="leaf-btn"
        aria-label="Abrir pensamientos del día"
        title="Pensamientos del día"
      >
        <span aria-hidden className="leaf-lines">
          <i />
          <i />
          <i />
        </span>
      </button>

      {open && (
        <div className="cyb-modal" onClick={close}>
          <div
            className="cyb-modal-panel paper-shell"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="blk-tag">
                La Hoja · {formatShortDate(date)}
              </span>
              <button
                type="button"
                onClick={close}
                className="cyb-link"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="cyb-paper">
              <textarea
                value={text}
                onChange={(event) => handleChange(event.target.value)}
                rows={14}
                placeholder="Escribí tus pensamientos del día..."
                aria-label="Pensamientos del día"
                className="cyb-paper-in"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <span
                role="status"
                aria-live="polite"
                className={`paper-status ${
                  status === "error"
                    ? "text-[var(--cyb-g1)]"
                    : status === "saved"
                      ? "text-[var(--cyb-green)]"
                      : status === "idle"
                        ? "cyb-muted"
                        : ""
                }`}
              >
                {statusLabel(status, lastSaved)}
              </span>
              {text.length > SOFT_CAP && (
                <span className="paper-warn">
                  Aviso de tinta: pasaste ~{SOFT_CAP.toLocaleString("es-AR")}{" "}
                  caracteres
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}