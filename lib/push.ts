import "server-only";
import webpush from "web-push";
import type { PushPayload, StoredSubscription } from "@/lib/push-client";

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function getWebPush(): typeof webpush {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:bitak0ra@localhost",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );
  return webpush;
}

export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; statusCode?: number }> {
  if (!isPushConfigured()) return { ok: false };
  const result = await getWebPush()
    .sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" }
    )
    .then(
      () => ({ ok: true } as const),
      (error: unknown) => ({
        ok: false as const,
        statusCode: (error as { statusCode?: number }).statusCode,
      })
    );
  return result;
}

export function dailyReviewPayload(): PushPayload {
  return {
    title: "BitAK0R4_ · Revisá tu bitácora",
    body: "Es hora de cerrar el día: repasá tus objetivos, notas y aprendizajes de hoy.",
    url: "/bitacora",
  };
}

export function reminderTomorrowPayload(
  contents: string[],
  url: string
): PushPayload {
  return {
    title: "BitAK0R4_ · Recordatorios para mañana",
    body: contents.slice(0, 3).join("  |  "),
    url,
  };
}