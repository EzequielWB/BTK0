import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  dailyReviewPayload,
  isPushConfigured,
  reminderTomorrowPayload,
  sendPush,
} from "@/lib/push";
import type { PushPayload, StoredSubscription } from "@/lib/push-client";
import { addDays, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SubRow = {
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (!secret || (auth !== `Bearer ${secret}` && querySecret !== secret)) {
    return NextResponse.json({ error: "Sin autorización" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "VAPID no configurado" },
      { status: 500 }
    );
  }

  const supabase = await createClient();

  const subscriptions =
    ((await supabase.from("push_subscriptions").select("*")).data ??
      []) as SubRow[];

  const stats = { daily: 0, reminders: 0, sent: 0, deleted: 0, failed: 0 };

  async function sendToAll(payload: PushPayload): Promise<void> {
    for (const row of subscriptions) {
      const sub: StoredSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.keys_p256dh, auth: row.keys_auth },
      };
      const result = await sendPush(sub, payload);
      if (result.ok) {
        stats.sent++;
      } else if (result.statusCode === 404 || result.statusCode === 410) {
        stats.deleted++;
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", row.endpoint);
      } else {
        stats.failed++;
      }
    }
  }

  await sendToAll(dailyReviewPayload());
  stats.daily = subscriptions.length;

  const tomorrow = addDays(todayISO(), 1);
  const { data: tomorrowReminders } = await supabase
    .from("reminders")
    .select("content")
    .eq("date", tomorrow)
    .is("completed_at", null);
  const contents = ((tomorrowReminders ?? []) as { content: string }[]).map(
    (row) => row.content
  );
  if (contents.length > 0) {
    await sendToAll(reminderTomorrowPayload(contents, `/bitacora/${tomorrow}`));
    stats.reminders = subscriptions.length;
  }

  return NextResponse.json({ ok: true, ...stats });
}