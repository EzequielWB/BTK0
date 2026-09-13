import { isLocalMode } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAll } from "@/lib/push";
import { addDays, arNow, formatShortDate } from "@/lib/utils";
import type { Reminder, Settings } from "@/lib/types";

export const runtime = "nodejs";

function json(message: unknown, status = 200): Response {
  return new Response(JSON.stringify(message), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return json({ error: "No autorizado." }, 401);
  }
  if (isLocalMode() || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return json({ error: "Las notificaciones requieren modo Supabase." }, 503);
  }

  const supabase = await createClient();

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("notif_daily_time, notif_reminder_time")
    .eq("id", 1)
    .maybeSingle();

  const settings = (settingsRow ?? null) as Pick<
    Settings,
    "notif_daily_time" | "notif_reminder_time"
  > | null;
  const dailyTime = settings?.notif_daily_time ?? "21:00";
  const reminderTime = settings?.notif_reminder_time ?? "09:00";

  const now = arNow();
  const today = now.date;
  const summary: Record<string, string> = {
    daily: "skipped",
    reminders: "skipped",
    removed: "0",
  };

  async function alreadySent(kind: string): Promise<boolean> {
    const { data } = await supabase
      .from("notif_log")
      .select("kind")
      .eq("kind", kind)
      .eq("sent_on", today)
      .maybeSingle();
    return Boolean(data);
  }

  async function markSent(kind: string): Promise<void> {
    await supabase
      .from("notif_log")
      .upsert({ kind, sent_on: today }, { onConflict: "kind,sent_on" });
  }

  // Recordatorio diario: revisá la bitácora.
  if (now.hour >= dailyTime && !(await alreadySent("daily"))) {
    const { sent } = await notifyAll({
      title: "BitAK0R4_",
      body: `Son las ${dailyTime}. Revisá tu bitácora.`,
      url: "/bitacora",
      tag: "bitakra-daily",
    });
    if (sent > 0) {
      await markSent("daily");
      summary.daily = `sent ${sent}`;
    }
  }

  // Aviso un día antes de cada recordatorio.
  if (now.hour >= reminderTime && !(await alreadySent("reminders"))) {
    const tomorrow = addDays(today, 1);
    const { data: remindersRow, error } = await supabase
      .from("reminders")
      .select("id, date, content")
      .eq("date", tomorrow)
      .is("completed_at", null);

    const reminders = ((remindersRow ?? []) as Reminder[]).filter(
      (row) => row.content
    );

    if (!error && reminders.length > 0) {
      let sent = 0;
      for (const row of reminders) {
        const result = await notifyAll({
          title: "Recordatorio mañana",
          body: `${formatShortDate(tomorrow)}: ${row.content}`,
          url: `/bitacora/${tomorrow}`,
          tag: `recordatorio-${row.id}`,
        });
        sent += result.sent;
      }
      if (sent > 0) {
        await markSent("reminders");
        summary.reminders = `sent ${Math.min(sent, reminders.length)}/${reminders.length}`;
      } else {
        summary.reminders = "no-subscribers";
      }
    } else if (!error) {
      summary.reminders = "none-tomorrow";
    }
  }

  return json({ ok: true, ...summary });
}

// El proxy de cron no pasa el Authorization original en algunos providers;
// admitir el verbo POST con el mismo chequeo.
export async function POST(req: Request): Promise<Response> {
  return GET(req);
}