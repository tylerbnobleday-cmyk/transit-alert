self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "A new TransitAlert update is available." };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "TransitAlert", {
      body: payload.body || "A new transport update is available.",
      icon: "./app-logo.svg",
      badge: "./app-logo.svg",
      tag: payload.tag || "transitalert-update",
      data: { url: payload.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.startsWith(self.registration.scope)) || clients[0];
      if (existingClient) {
        return existingClient.focus().then(() => existingClient.navigate?.(targetUrl));
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
