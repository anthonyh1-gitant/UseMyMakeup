/* Static production app shell only; no photos, notes or remote API responses. */
const CACHE = 'use-my-makeup-shell-v1'
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/', { cache: 'reload' })
    if (!response.ok) throw new Error('App shell unavailable')
    const html = await response.text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(match => match[1])
    const cache = await caches.open(CACHE)
    await cache.addAll(['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', ...assets])
  })())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('use-my-makeup-shell-') && key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) { const cache = await caches.open(CACHE); await cache.put('/', response.clone()) }
        return response
      } catch { return await caches.match('/') || Response.error() }
    })())
  } else if (url.pathname.startsWith('/assets/') || ['/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'].includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(request, response.clone()) }
      return response
    })())
  }
})
