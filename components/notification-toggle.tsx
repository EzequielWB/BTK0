"use client";

import { useEffect, useState } from "react";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/lib/actions";

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

function keyToBase64(key: ArrayBuffer | null): string | null {
  if (!key) return null;
  const bytes = new Uint8Array(key);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function NotificationToggle() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined";
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(
    () =>
      supported && typeof Notification !== "undefined" &&
      Notification.permission === "denied"
  );
  const [vapid] = useState(
    () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(sub));
      } catch {
        setSubscribed(false);
      }
    })();
  }, [supported]);

  async function habilitar() {
    if (!supported || !vapid || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDenied(true);
        setMsg("Permiso denegado. Habilitalo desde los ajustes del navegador.");
        return;
      }
      setDenied(false);

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setMsg("Faltan las claves VAPID de configuración.");
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey),
        }));

      const p256dh = keyToBase64(sub.getKey("p256dh"));
      const auth = keyToBase64(sub.getKey("auth"));
      if (!sub.endpoint || !p256dh || !auth) {
        setMsg("La suscripción no trajo las claves necesarias.");
        return;
      }

      const res = await savePushSubscriptionAction({
        endpoint: sub.endpoint,
        keys: { p256dh, auth },
      });
      if (res.error) {
        setMsg(res.error);
        return;
      }
      setSubscribed(true);
      setMsg(res.success ?? "Activado.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "No se pudo activar.");
    } finally {
      setBusy(false);
    }
  }

  async function desactivar() {
    if (!supported || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      if (sub?.endpoint) await deletePushSubscriptionAction(sub.endpoint);
      setSubscribed(false);
      setMsg("Notificaciones desactivadas.");
    } catch (error) {
      setMsg(
        error instanceof Error ? error.message : "No se pudo desactivar."
      );
    } finally {
      setBusy(false);
    }
  }

  async function probar() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await sendTestPushAction();
      setMsg(res.error ?? res.success ?? null);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Fallo al probar.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="cyb-hint text-sm">
        Tu navegador no soporta notificaciones push para esta app.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {subscribed ? (
          <>
            <button
              type="button"
              className="cyb-danger-btn"
              disabled={busy}
              onClick={() => void desactivar()}
            >
              Desactivar notificaciones
            </button>
            <button
              type="button"
              className="cyb-btn tight"
              disabled={busy}
              onClick={() => void probar()}
            >
              Probar
            </button>
            <span className="cyb-hint text-xs">Marcas activas.</span>
          </>
        ) : (
          <button
            type="button"
            className="cyb-btn"
            disabled={busy || !vapid}
            onClick={() => void habilitar()}
          >
            Activar notificaciones
          </button>
        )}
      </div>

      {!vapid && (
        <p className="cyb-hint text-sm">
          Falta configurar las claves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY).
        </p>
      )}
      {denied && (
        <p className="cyb-hint text-sm">
          Permiso denegado: habilitalo desde los ajustes del navegador
          (Chrome → Notificaciones → Permitir).
        </p>
      )}
      {msg && <p className="cyb-hint text-sm">{msg}</p>}
    </div>
  );
}