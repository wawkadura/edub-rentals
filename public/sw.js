const CACHE_VERSION = 'edub-rentals-v12'
const APP_SHELL = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => null),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) return
  // Manifest + branded icons: network-only so updates ship instantly.
  if (
    url.pathname.endsWith('.webmanifest') ||
    /^\/(icon-\d+|favicon-?\d*|apple-touch-icon)\.png$/.test(url.pathname)
  ) {
    return
  }
  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)
  if (cached) {
    fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone())
    }).catch(() => null)
    return cached
  }
  try {
    const res = await fetch(request)
    if (res.ok && request.url.startsWith(self.location.origin)) {
      cache.put(request, res.clone())
    }
    return res
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' })
  }
}
