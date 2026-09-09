"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/lib/actions";
import { urlBase64ToUint8Array } from "@/lib/push-client";

export function NotificationsToggle() {
  const [ready, setReady] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!ready || Notification.permission !== "granted") return;
    let cancelled = false;
    navigator.serviceWorker
      .ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setSubscribed(Boolean(subscription));
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) return null;

  const supported =
    "Notification" in window && "serviceWorker" in navigator;
  if (!supported) {
    return (
      <section className="blk">
        <h2 className="blk-tag">Notificaciones</h2>
        <p className="cyb-muted text-sm">
          Tu navegador no soporta notificaciones web push. Probá desde Chrome o
          Safari con la app instalada.
        </p>
      </section>
    );
  }

  async function handleEnable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setMessage("No se otorgó el permiso para notificaciones.");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
            ),
          }));
        const json = subscription.toJSON() as {
          endpoint: string;
          keys?: { p256dh?: string; auth?: string };
        };
        const result = await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
        });
        if (result.error) {
          setMessage(result.error);
          return;
        }
        setSubscribed(true);
      } catch (error) {
        const reason =
          error instanceof Error &&
          /subscribe|service worker/i.test(error.message)
            ? "El service worker no está activo (probá correr la app con el build de producción)."
            : "No se pudieron activar las notificaciones.";
        setMessage(reason);
      }
    });
  }

  async function handleDisable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const json = subscription.toJSON() as { endpoint: string };
          const result = await deletePushSubscriptionAction(json.endpoint);
          if (result.error) {
            setMessage(result.error);
            return;
          }
          await subscription.unsubscribe();
        }
        setSubscribed(false);
      } catch {
        setMessage("No se pudieron desactivar las notificaciones.");
      }
    });
  }

  return (
    <section className="blk">
      <h2 className="blk-tag">Notificaciones_push</h2>
      <p className="cyb-muted text-sm mb-3">
        Recibís una notificación cada día a las 22:00 para revisar la bitácora y
        un aviso un día antes de cada recordatorio. Requiere instalar la app y
        dar permiso una sola vez.
      </p>

      {subscribed ? (
        <button
          type="button"
          onClick={handleDisable}
          disabled={pending}
          className="cyb-link red disabled:opacity-40"
        >
          {pending ? "Desactivando..." : "Desactivar notificaciones"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={pending}
          className="cyb-btn disabled:opacity-40"
        >
          {pending ? "Activando..." : "Activar notificaciones"}
        </button>
      )}

      {subscribed ? (
        <p className="text-sm text-[#00ff9d] mt-2" role="status">
          Notificaciones activadas.
        </p>
      ) : null}
      {Notification.permission === "denied" ? (
        <p className="text-sm text-[#ff3b5c] mt-2">
          Permiso denegado en el navegador. Habilitalo desde Ajustes del
          navegador.
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[#ff3b5c] mt-2">{message}</p>
      ) : null}
    </section>
  );
}