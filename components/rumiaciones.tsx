"use client";

import { useEffect, useRef, useState } from "react";
import { saveRumiacionesAction } from "@/lib/actions";

const SOFT_CAP = 20_000;
const SAVE_DELAY_MS = 1500;

type SaveState = "idle" | "editing" | "saving" | "saved" | "error";

function statusLabel(status: SaveState, lastSaved: string | null): string {
  switch (status) {
    case "editing":
      return "EDITANDO…";
    case "saving":
      return "GUARDANDO…";
    case "saved":
      return `GUARDADO · ${lastSaved ?? ""}`;
    case "error":
      return "ERROR AL GUARDAR";
    default:
      return "SIN CAMBIOS";
  }
}

export function Rumiaciones({ initial }: { initial: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const textRef = useRef(text);
  const dirtyRef = useRef(false);
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
    setStatus("saving");
    const result = await saveRumiacionesAction(textRef.current.trim());
    if (result?.error) {
      dirtyRef.current = true;
      setStatus("error");
    } else {
      setStatus("saved");
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
    setStatus("editing");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, SAVE_DELAY_MS);
  }

  function handleClose() {
    void flush();
    setOpen(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void saveRumiacionesAction(textRef.current.trim());
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cyb-rumi-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Rumiaciones"
        aria-label="Abrir Rumiaciones"
      >
        <svg
          className="cyb-rumi-ico"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 3.5h8.5L19 9V20.5H5z" />
          <path d="M13.5 3.5v5.5h5.5" />
          <path d="M8 11.5h8.5" />
          <path d="M8 14.2h8.5" />
          <path d="M8 16.9h5.5" />
        </svg>
      </button>

      {open && (
        <div className="cyb-rumi-modal" onClick={handleClose}>
          <div
            className="cyb-rumi-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Rumiaciones"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cyb-rumi-head">
              <span className="cyb-rumi-title">
                RUMIACIONES
                <span className="tw-caret" aria-hidden>
                  ▊
                </span>
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="cyb-rumi-close"
                aria-label="Cerrar Rumiaciones"
              >
                ✕
              </button>
            </div>

            <div className="cyb-rumi-body">
              <textarea
                value={text}
                onChange={(event) => handleChange(event.target.value)}
                rows={12}
                placeholder="¿Qué te está dando vueltas? Desahogalo acá..."
                aria-label="Rumiaciones"
                autoFocus
                className="cyb-rumi-in"
              />
            </div>

            <div className="cyb-rumi-foot">
              <span
                role="status"
                aria-live="polite"
                className={
                  status === "error"
                    ? "text-[#ff3b5c]"
                    : status === "saved"
                      ? "text-[var(--cyb-green)]"
                      : status === "idle"
                        ? "opacity-50"
                        : ""
                }
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