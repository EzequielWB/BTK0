import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
};

self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = {};
  }
  const url = payload.url ?? "/bitacora";
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "BitAK0R4_", {
      body: payload.body ?? "",
      icon: payload.icon ?? "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag ?? "bitakra",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = new URL(data?.url ?? "/bitacora", self.location.origin).pathname;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = clients.find(
        (client) => new URL(client.url).pathname === url
      );
      if (existing) {
        await existing.focus();
        if (existing.url !== self.location.origin + url) {
          await existing.navigate(url);
        }
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});