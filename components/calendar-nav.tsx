"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ReminderPanel } from "@/components/reminder-panel";
import { deleteDayDataAction } from "@/lib/actions";
import type { DayMark, Reminder } from "@/lib/types";
import {
  formatShortDate,
  getMonthGrid,
  monthLabel,
  parseISODate,
  todayISO,
  WEEKDAYS,
} from "@/lib/utils";

const HOLD_MS = 550;
const MOVE_TOLERANCE = 10;

export function CalendarNav({
  date,
  marks = {},
  reminders = {},
  pendingReminders,
  flaggedDates = [],
  annualDates = [],
}: {
  date: string;
  marks?: Record<string, DayMark>;
  reminders?: Record<string, Reminder[]>;
  pendingReminders?: Record<string, Reminder[]>;
  flaggedDates?: string[];
  annualDates?: string[];
}) {
  const parsed = parseISODate(date);
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth());
  const [modalDate, setModalDate] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const [deleteDate, setDeleteDate] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [, deleteAction, deletePending] = useActionState(
    async (prev: unknown, fd: FormData) => {
      const res = await deleteDayDataAction(String(fd.get("date") ?? ""));
      if (res && res.success) {
        setDeleteDate(null);
        setDeleteStep(0);
      }
      return res;
    },
    null
  );

  const today = todayISO();
  const grid = getMonthGrid(year, month);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <nav>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          className="cal-btn"
          aria-label="Año anterior"
        >
          ←
        </button>
        <span className="font-medium text-center flex-1">{year}</span>
        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          className="cal-btn"
          aria-label="Año siguiente"
        >
          →
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goPrev}
          className="cal-btn"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong className="capitalize text-center">{monthLabel(year, month)}</strong>
        <button
          type="button"
          onClick={goNext}
          className="cal-btn"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div
        className="grid grid-cols-7 gap-1 text-center text-xs cyb-cal-grid"
        onContextMenu={(event) => event.preventDefault()}
      >
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 cyb-cal-hd">
            {w}
          </span>
        ))}
        {grid.map((cell, i) => {
          if (!cell) return <span key={`empty-${i}`} />;

          const mark = marks[cell];
          const segs = [
            mark?.complete ? "segs-g" : null,
            mark?.note ? "segs-a" : null,
            mark?.learn ? "segs-r" : null,
            mark?.thought ? "segs-w" : null,
          ].filter((className): className is string => Boolean(className));

          const isFuture = cell > today;
          // Recuadro rojo: solo recordatorios PENDIENTES (sin completar)
          // de hoy o futuro. Los completados y los vencidos quedan en la
          // tarjeta del día pero sin marcar el calendario.
          const hasReminder =
            cell >= today &&
            ((pendingReminders ?? reminders)[cell]?.length ?? 0) > 0;
          const isFlagged = flaggedDates.includes(cell);
          const isAnnual = annualDates.includes(cell);

          const numClass = ["cyb-num"]
            .concat(cell === date ? "today" : "")
            .concat(segs.length > 0 ? "has-segs" : "")
            .concat(isFuture ? "future" : "")
            .concat(hasReminder ? "has-reminder" : "")
            .concat(isFlagged ? "has-flag" : "")
            .concat(isAnnual ? "has-annual" : "")
            .join(" ");

          const onPointerDown = (boy: React.PointerEvent) => {
            clearHold();
            startPos.current = { x: boy.clientX, y: boy.clientY };
            longFired.current = false;
            timerRef.current = setTimeout(() => {
              longFired.current = true;
              setModalDate(cell);
            }, HOLD_MS);
          };

          const onPointerMove = (boy: React.PointerEvent) => {
            if (!timerRef.current) return;
            const dx = Math.abs(boy.clientX - startPos.current.x);
            const dy = Math.abs(boy.clientY - startPos.current.y);
            if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clearHold();
          };

          return (
            <Link
              key={cell}
              href={`/bitacora/${cell}`}
              title={
                isAnnual
                  ? "Efeméride"
                  : isFlagged
                    ? "Día destacado"
                    : hasReminder
                      ? "Hay recordatorio"
                      : isFuture
                        ? "Vista futura (solo lectura)"
                        : mark?.complete
                          ? "Día cumplido"
                          : mark?.note || mark?.learn
                            ? "Día registrado"
                            : undefined
              }
              className="py-1 flex items-center justify-center rounded hover:bg-zinc-800/50"
              onPointerDown={onPointerDown}
              onPointerUp={clearHold}
              onPointerLeave={clearHold}
              onPointerCancel={clearHold}
              onPointerMove={onPointerMove}
              onClick={(event) => {
                if (longFired.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  longFired.current = false;
                  return;
                }
                if (event.detail >= 3 && cell <= today) {
                  event.preventDefault();
                  event.stopPropagation();
                  setDeleteDate(cell);
                  setDeleteStep(1);
                }
              }}
            >
              <span className={numClass}>
                {segs.length > 0 && (
                  <span aria-hidden className="cyb-segs">
                    {segs.map((className) => (
                      <i key={className} className={className} />
                    ))}
                  </span>
                )}
                <span className="cyb-day-num">
                  {cell === today ? `*${cell.slice(8)}` : cell.slice(8)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {modalDate && (
        <div className="cyb-modal" onClick={() => setModalDate(null)}>
          <div className="cyb-modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="blk-tag">
                Recordatorio · {formatShortDate(modalDate)}
              </span>
              <button
                type="button"
                onClick={() => setModalDate(null)}
                className="cyb-link"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <ReminderPanel date={modalDate} initialReminders={reminders[modalDate] ?? []} />
          </div>
        </div>
      )}

      {deleteDate && (
        <div className="cyb-modal" onClick={() => { setDeleteDate(null); setDeleteStep(0); }}>
          <div
            className="cyb-modal-panel cyb-modal-danger"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="blk-tag">Borrar día · {formatShortDate(deleteDate)}</span>
            <p className="cyb-hint mt-2 mb-4">
              Se va a borrar todo: notas, aprendizajes, recordatorios y objetivos
              registrados este día.
            </p>

            <div className="flex flex-col gap-3">
              {deleteStep === 1 ? (
                <button
                  type="button"
                  className="cyb-danger-btn"
                  disabled={deletePending}
                  onClick={() => setDeleteStep(2)}
                >
                  Seguro, borrar
                </button>
              ) : (
                <form action={deleteAction}>
                  <input type="hidden" name="date" value={deleteDate} />
                  <button
                    type="submit"
                    className="cyb-danger-btn cyb-danger-btn-fire"
                    disabled={deletePending}
                  >
                    {deletePending ? "BORRANDO..." : "SÍ, BORRAR"}
                  </button>
                </form>
              )}
              <button type="button" className="cyb-link" onClick={() => { setDeleteDate(null); setDeleteStep(0); }}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}