// Service worker for the admin panel: shows push notifications for new
// reservations and opens the right page when one is tapped.

self.addEventListener("push", (event) => {
  let data = { titulli: "Njoftim i ri", teksti: "", url: "/admin" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.titulli, {
      body: data.teksti,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((dritaret) => {
      for (const d of dritaret) {
        if (new URL(d.url).pathname.startsWith("/admin") && "focus" in d) {
          d.navigate(url);
          return d.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
