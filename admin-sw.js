// ============================================================
// ViralScript AI — admin-sw.js — Service Worker do PAINEL PRIVADO
// v9.5.7 — Propósito ÚNICO: satisfazer o requisito de instalabilidade
// do Chrome (página controlada por SW com fetch handler) para o
// painel-k7x9.html instalar como app (fato ②/V9.5.5 → comando do dono).
// REGRA DE OURO: NÃO CACHEIA NADA — pass-through puro (decisão v9.3:
// painel FORA do shell; página privada SEMPRE fresca da rede).
// REGISTRO com escopo RESTRICTO ('/painel-k7x9.html') feito no painel:
// assim coexiste com o /sw.js do site (longest-prefix match) — NUNCA
// registrar este script sem scope (substituiria o sw.js no escopo '/').
// ============================================================

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through transparente: rede SEMPRE, nenhum cache, nenhum fallback.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});