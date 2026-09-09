"use client";

import { useState } from "react";
import { ReminderPanel } from "@/components/reminder-panel";

export function ReminderFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="cyb-rem-fab"
        onClick={() => setOpen(true)}
        title="Recordatorio con fecha propia (dd/mm/aa)"
        aria-label="Agregar recordatorio con fecha propia"
      >
        <span className="cyb-rem-fab-tag">REC+</span>
        <span className="cyb-rem-fab-sub">fecha propia</span>
      </button>

      {open && (
        <div className="cyb-modal" onClick={() => setOpen(false)}>
          <div
            className="cyb-modal-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="blk-tag">Recordatorio · fecha propia</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cyb-link"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <ReminderPanel initialReminders={[]} />
          </div>
        </div>
      )}
    </>
  );
}