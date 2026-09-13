// ============================================================
// ViralScript AI — Service Worker (PWA) — v7
// Estratégia: cache do shell (CSS + páginas de conteúdo + ícones).
// A API (/api/*) NUNCA é cacheada (resposta única, dados ao vivo).
// v4 — MONETIZAÇÃO AdSense: scripts de anúncios e analytics
// (googlesyndication, doubleclick, googletagmanager, google-analytics)
// vão SEMPRE à rede — cacheá-los quebra anúncios e medição.
// v5 — GERADOR DE THUMBNAILS: /thumbnails.html entra no pré-cache
// do shell (página do gerador de imagens, v8.8) + bump de cache.
// v6 — CORREÇÕES:
//   (1) '/' (a HOME) entra no pré-cache;
//   (2) /config.js agora é REDE-PRIMEIRO (configurações valendo
//       na visita seguinte, sem atraso de cache);
//   (3) fallback de navegação em cascata: página → home → 404;
//   (4) resposta de erro limpa quando não há cache nem rede.
// v7 — BUMP POR CAUSA DO MANIFEST: o manifest.json é servido com
//       estratégia "cache primeiro" (regra geral abaixo). Sem bump,
//       usuários antigos continuariam com o manifest v1 mesmo após
//       o deploy do v2. O bump v6 → v7 apaga o cache antigo e força
//       o re-download. Acompanha o manifest v2 (scope explícito +
//       atalhos rápidos no ícone do app).
//
// ⚠️ REGRA DE OURO DO BUMP: sempre que você atualizar qualquer
// arquivo servido com "cache primeiro" (estilo.css, ícones, guias,
// MANIFEST etc.), aumente o número abaixo (v7 → v8 → v9...). O
// navegador só reinstala este arquivo se ele mudar, e o número
// novo é o que dispara a limpeza do cache antigo. HTML e config.js
// não dependem disso (já usam rede-primeiro).
// ============================================================

const CACHE_NAME = 'viralscript-v7';

const RECURSOS_OFFLINE = [
  '/',
  '/config.js',
  '/estilo.css',
  '/thumbnails.html',
  '/guia-roteiros-virais.html',
  '/guia-chave-api-gratis.html',
  '/guia-plataformas.html',
  '/faq.html',
  '/sobre.html',
  '/politica-privacidade.html',
  '/termos-uso.html',
  '/contato.html',
  '/404.html',
  '/icon.svg',
  '/icon-maskable.svg',
  '/robot.svg',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// v4 — domínios de terceiros (anúncios + medição): rede SEMPRE.
const DOMINIOS_REDE = [
  'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'analytics.google.com',
  'region1.google-analytics.com'
];

// v6 — arquivos que devem ser buscados na REDE PRIMEIRO (com cache
// como salva-vidas offline). config.js entra aqui porque é o painel
// de controle do site (GA4, AdSense, Pix): mudanças precisam valer
// já na visita seguinte de cada usuário, não duas visitas depois.
const CAMINHOS_REDE_PRIMEIRO = [
  '/config.js'
];

// Instalação: pré-cacheia o shell. Tolerante a falhas individuais:
// cache.add() por recurso dentro de Promise.allSettled — se um arquivo
// ainda não existir no deploy, o shell instala mesmo assim.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => Promise.allSettled(RECURSOS_OFFLINE.map((url) => cache.add(url))))
    .then(() => self.skipWaiting())
  );
});

// Ativação: remove caches antigos (quando a versão do CACHE_NAME mudar)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
    .then((chaves) => Promise.all(
      chaves
      .filter((chave) => chave !== CACHE_NAME)
      .map((chave) => caches.delete(chave))
    ))
    .then(() => self.clients.claim())
  );
});

// Estratégia de fetch:
//  - /api/* e domínios de ads/analytics → rede SEMPRE;
//  - /config.js → rede primeiro, cache como fallback offline (v6);
//  - HTML de navegação → rede primeiro, cai no cache se offline
//    (fallback em cascata: página → home → 404);
//  - CSS/ícone/manifest → cache primeiro, revalidando em segundo plano.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API e terceiros de anúncio/medição: nunca cachear
  if (url.pathname.startsWith('/api/') || DOMINIOS_REDE.includes(url.hostname)) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // v6 — rede-primeiro para arquivos de configuração
  if (CAMINHOS_REDE_PRIMEIRO.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
      .then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((doCache) => doCache || Response.error())
      )
    );
    return;
  }
  
  // Páginas HTML (navegação): rede primeiro, cache como fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return res;
      })
      .catch(() =>
        caches.match(event.request)
        // v6 — cascata: a página pedida → a home ('/') → 404
        .then((r) => r || caches.match('/'))
        .then((r) => r || caches.match('/404.html'))
      )
    );
    return;
  }
  
  // Demais recursos (css/ícone/manifest): cache primeiro + revalidação
  event.respondWith(
    caches.match(event.request).then((doCache) => {
      const daRede = fetch(event.request)
        .then((res) => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return res;
        })
        // v6 — sem cache E sem rede: erro de rede limpo (antes o
        // handler entregava "undefined" ao navegador)
        .catch(() => doCache || Response.error());
      return doCache || daRede;
    })
  );
});