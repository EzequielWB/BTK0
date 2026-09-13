import webpush from "web-push";
import { createClient, isLocalMode } from "@/lib/supabase/server";
import type { PushSubscriptionRow } from "@/lib/types";

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export function vapidReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

function ensureVapid(): void {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "Faltan las claves VAPID de notificaciones (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)."
    );
  }
  webpush.setVapidDetails(
    process.env.SITE_URL ?? "bitakra@localhost",
    publicKey,
    privateKey
  );
}

/** Envía un push a todas las suscripciones guardadas. Limpia las que murieron (404/410). */
export async function notifyAll(payload: PushPayload): Promise<{
  sent: number;
  removed: number;
}> {
  if (isLocalMode() || !vapidReady()) return { sent: 0, removed: 0 };

  const supabase = await createClient();
  const { data } = await supabase.from("push_subs").select("*");

  const subs = ((data ?? []) as PushSubscriptionRow[]).filter(
    (sub) => sub.endpoint && sub.p256dh && sub.auth
  );
  if (subs.length === 0) return { sent: 0, removed: 0 };

  ensureVapid();
  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
        { TTL: 86400 }
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subs").delete().eq("endpoint", sub.endpoint);
        removed += 1;
      }
    }
  }

  return { sent, removed };
}