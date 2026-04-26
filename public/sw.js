// Cache only static assets — never cache HTML pages so the app is always fresh
const CACHE = 'choreboard-assets-v1'

const ASSET_PATTERNS = [
  /\/icons\//,
  /\/_next\/static\//,
  /\.png$/,
  /\.svg$/,
  /\.ico$/,
  /\.woff2?$/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
]

function isAsset(url) {
  return ASSET_PATTERNS.some(p => p.test(url))
}

self.addEventListener('install', e => {
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return

  const url = e.request.url

  // Always fetch HTML and API calls fresh from network
  if (!isAsset(url)) {
    e.respondWith(fetch(e.request))
    return
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(cache => cache.put(e.request, clone))
        }
        return res
      })
    })
  )
})
