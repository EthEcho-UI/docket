/* Docket service worker: offline app shell, cached fonts/libraries, push reminders */
const VERSION = 'docket-v3';
const RUNTIME = 'docket-runtime';
const PUSH_SERVER = 'https://docket-push.ethecho-ui.workers.dev';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/favicon-32.png', './icons/badge-96.png'];
const EXTERNAL = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const shell = await caches.open(VERSION);
    await shell.addAll(SHELL);
    /* best effort: keep the spreadsheet library around so export works offline */
    const rt = await caches.open(RUNTIME);
    await rt.add('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js').catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== RUNTIME) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* the page itself: network first so updates arrive, cached copy when offline */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.origin === location.origin) { e.respondWith(caches.match(req).then(hit => hit || fetch(req))); return; }
  /* fonts and libraries: serve the cached copy, refresh it in the background */
  if (EXTERNAL.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

/* pushes arrive empty; the reminder text is waiting on the push server */
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let items = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      if (sub && PUSH_SERVER.startsWith('https://')) {
        const r = await fetch(PUSH_SERVER + '/pending', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({endpoint: sub.endpoint})});
        items = (await r.json()).items || [];
      }
    } catch (err) { /* offline or server unreachable: fall back to a generic reminder */ }
    if (!items.length) items = [{title: 'Docket', body: 'You have a reminder. Open Docket to see it.', tag: 'docket'}];
    await Promise.all(items.map(i => self.registration.showNotification(i.title, {
      body: i.body, tag: i.tag, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', vibrate: [200, 100, 200], data: {url: './'}
    })));
  })());
});

/* the browser renewed this device's push registration: register again and move the schedule over */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const old = e.oldSubscription, key = old && old.options && old.options.applicationServerKey;
    if (!key || !PUSH_SERVER.startsWith('https://')) return;
    const sub = e.newSubscription || await self.registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key});
    await fetch(PUSH_SERVER + '/move', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({endpoint: old.endpoint, to: sub.endpoint})}).catch(() => {});
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow('./');
  }));
});
