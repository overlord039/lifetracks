
/**
 * LifeTrack Service Worker
 * Minimum viable service worker for PWA installation criteria.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through for network requests. 
  // Required for PWA "Installable" status in modern browsers.
  event.respondWith(fetch(event.request));
});
