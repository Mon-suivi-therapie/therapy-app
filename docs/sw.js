// Service worker : garde les fichiers du site pour un démarrage rapide.
// Les données de santé (Supabase) ne sont JAMAIS mises en cache ici.
const V = "suivi-v19";
const FILES = ["./", "index.html", "style.css", "core.js", "tab-dash.js", "tab-cycle.js", "tab-health.js", "tab-misc.js", "tab-modes.js", "tab-bilan.js", "tab-suivi2.js", "tab-resume.js", "tab-extra.js", "tab-plus.js", "tab-new.js", "tab-sante.js", "main.js", "manifest.webmanifest", "icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Supabase, polices, CDN : réseau direct
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
