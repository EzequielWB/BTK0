"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const ROOT_ID = "antesala-root";

// El destino del portal no cambia en toda la vida de la página: no hace falta
// suscribirse a nada, solo leerlo del DOM en el cliente (en el servidor no hay
// documento y devuelve null).
const noSubscription = () => () => {};

/** Ventana de entrada a la bitácora: se abre sobre la vista del día (que queda
 * difuminada detrás) y muestra los objetivos globales y la frase del día.
 * El botón la cierra y limpia el marcador de la URL para que refrescar no la
 * vuelva a abrir. */
export function Antesala({
  date,
  children,
}: {
  date: string;
  children: ReactNode;
}) {
  const target = useSyncExternalStore<HTMLElement | null>(
    noSubscription,
    () => document.getElementById(ROOT_ID),
    () => null
  );
  const [open, setOpen] = useState(true);

  const enter = useCallback(() => {
    setOpen(false);
    window.history.replaceState(null, "", `/bitacora/${date}`);
  }, [date]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") enter();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, enter]);

  if (!target || !open) return null;

  return createPortal(
    <div
      className="cyb-antesala"
      role="dialog"
      aria-modal="true"
      aria-label="Antesala"
    >
      <div className="cyb-antesala-panel">
        <p className="cyb-antesala-lead">Antesala</p>
        <div className="space-y-4">{children}</div>
        <button
          type="button"
          onClick={enter}
          className="cyb-btn cyb-antesala-enter"
        >
          Entrar a la bitácora
        </button>
      </div>
    </div>,
    target
  );
}
