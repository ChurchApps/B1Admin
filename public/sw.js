// Kill-switch service worker. Replaces the previous Workbox PWA service
// worker so existing installs unregister and clear their caches on the
// next update check. Safe to delete this file (and the s3 cp line in
// package.json) after enough time has passed that virtually all users
// have visited at least once post-deploy.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
