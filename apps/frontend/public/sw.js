self.addEventListener("push", (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "Restaurant OS Alert";
    const options = {
      body: data.body || "A new update has been received.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: data.url || "/"
      }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error processing push event", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const urlToOpen = event.notification.data?.url || "/";
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
