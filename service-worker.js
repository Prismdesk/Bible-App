/* service-worker.js — offline app shell caching for the Bible PWA */

const CACHE_NAME = 'bible-app-cache-v4';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './data-loader.js',
  './meta.js',
  './gen.js',
  './exo.js',
  './lev.js',
  './num.js',
  './deu.js',
  './jos.js',
  './jdg.js',
  './rut.js',
  './1sa.js',
  './2sa.js',
  './1ki.js',
  './2ki.js',
  './1ch.js',
  './2ch.js',
  './ezr.js',
  './neh.js',
  './est.js',
  './job.js',
  './psa.js',
  './pro.js',
  './ecc.js',
  './sng.js',
  './isa.js',
  './jer.js',
  './lam.js',
  './ezk.js',
  './dan.js',
  './hos.js',
  './jol.js',
  './amo.js',
  './oba.js',
  './jon.js',
  './mic.js',
  './nam.js',
  './hab.js',
  './zep.js',
  './hag.js',
  './zec.js',
  './mal.js',
  './mat.js',
  './mrk.js',
  './luk.js',
  './jhn.js',
  './act.js',
  './rom.js',
  './1co.js',
  './2co.js',
  './gal.js',
  './eph.js',
  './php.js',
  './col.js',
  './1th.js',
  './2th.js',
  './1ti.js',
  './2ti.js',
  './tit.js',
  './phm.js',
  './heb.js',
  './jas.js',
  './1pe.js',
  './2pe.js',
  './1jn.js',
  './2jn.js',
  './3jn.js',
  './jud.js',
  './rev.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  './favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
