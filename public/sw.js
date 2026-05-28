const CACHE_NAME = 'certflow-v1'

// Instala e ativa imediatamente
self.addEventListener('install',   () => self.skipWaiting())
self.addEventListener('activate',  e  => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Não intercepta: chamadas de API, autenticação ou outros domínios
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.origin !== self.location.origin
  ) return

  // Network-first para páginas (sempre tenta buscar versão atualizada)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Armazena páginas no cache
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request)) // Offline: usa cache
  )
})