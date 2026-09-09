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

type PushData = { title?: string; body?: string; url?: string };

self.addEventListener("push", (event) => {
  let data: PushData | null = null;
  try {
    data = event.data?.json() ?? null;
  } catch {
    data = null;
  }
  event.waitUntil(
    self.registration.showNotification(data?.title ?? "BitAK0R4_", {
      body: data?.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data?.url ?? "/bitacora" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data?.url as string | undefined) ?? "/bitacora",
    self.location.origin
  ).toString();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client && client.url) {
            return client.navigate(url).then(() => client.focus());
          }
        }
        return self.clients.openWindow(url);
      })
  );
});