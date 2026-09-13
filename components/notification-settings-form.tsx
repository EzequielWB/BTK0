"use client";

import { useState } from "react";
import { saveNotificationTimesAction } from "@/lib/actions";

export function NotificationSettingsForm({
  daily,
  reminder,
}: {
  daily: string;
  reminder: string;
}) {
  const [dailyTime, setDailyTime] = useState(daily || "21:00");
  const [reminderTime, setReminderTime] = useState(reminder || "09:00");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function guardar() {
    setBusy(true);
    setMsg(null);
    const res = await saveNotificationTimesAction(dailyTime, reminderTime);
    setMsg(res.error ?? res.success ?? null);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="cyb-muted flex flex-col gap-1 text-xs">
          Recordatorio diario (revisar bitácora)
          <input
            type="time"
            value={dailyTime}
            onChange={(event) => setDailyTime(event.target.value)}
            className="cyb-in"
          />
        </label>
        <label className="cyb-muted flex flex-col gap-1 text-xs">
          Aviso previo (un día antes de cada recordatorio)
          <input
            type="time"
            value={reminderTime}
            onChange={(event) => setReminderTime(event.target.value)}
            className="cyb-in"
          />
        </label>
      </div>
      <div>
        <button
          type="button"
          className="cyb-btn tight"
          disabled={busy}
          onClick={() => void guardar()}
        >
          Guardar horas
        </button>
      </div>
      {msg && <p className="cyb-hint text-sm">{msg}</p>}
    </div>
  );
}