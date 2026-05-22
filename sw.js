/**
 * Service Worker für MathLern PWA
 * Version: 1.0.0 - Debug Version
 */

const CACHE_NAME = 'mathlern-v1';

// Nur die absolut notwendigen Dateien cachen
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/profile.html',
  '/topic.html',
  '/task.html',
  '/offline.html',
  '/css/main.css',
  '/css/components.css',
  '/css/profile.css',
  '/css/task.css',
  '/css/topic.css',
  '/css/offline.css'
];

// Installation - Nur grundlegende Dateien cachen
self.addEventListener('install', (event) => {
  console.log('[SW] Installiere...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(STATIC_ASSETS);
        console.log('[SW] Grundlegende Assets gecacht');
      } catch (error) {
        console.error('[SW] Fehler beim Cachen:', error);
      }
    })
  );
  
  // Sofort aktivieren
  self.skipWaiting();
});

// Aktivierung - Alte Caches löschen
self.addEventListener('activate', (event) => {
  console.log('[SW] Aktiviere...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Lösche alten Cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Sofort Kontrolle übernehmen
  event.waitUntil(self.clients.claim());
});

// Fetch-Event - Einfache Cache-Strategie
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Nur GET-Anfragen
  if (event.request.method !== 'GET') return;
  
  // Externe Ressourcen nicht cachen
  if (url.origin !== self.location.origin) return;
  
  // HTML-Dateien: Network First (für Updates)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Erfolgreiche Antwort cachen
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback: Aus Cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Assets: Cache First (für Geschwindigkeit)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((networkResponse) => {
        // Nur erfolgreiche Antworten cachen
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Für Bilder: Platzhalter zurückgeben
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
          return new Response('', { status: 200, statusText: 'OK' });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});