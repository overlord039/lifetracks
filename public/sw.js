
/**
 * @fileOverview Minimal Service Worker for LifeTrack PWA.
 * Satisfies the installation criteria for standalone mode on mobile devices.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch logic to satisfy PWA requirements
  event.respondWith(fetch(event.request));
});
