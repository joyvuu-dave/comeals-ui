// No-op service worker that replaces the old Workbox caching worker.
// It immediately activates, clears all caches, and lets all requests
// pass through to the network. The app code then calls
// navigator.serviceWorker.getRegistrations() to unregister it.
//
// This file must remain deployed permanently — it is the mechanism
// by which returning users' old service workers get neutralized.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        return Promise.all(
          names.map(function (name) {
            return caches.delete(name);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});
