const CACHE_NAME = 'stockman-cache-v4';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
];

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw error;
    }
}

async function navigationFallback(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedRoot = await caches.match('/');
        if (cachedRoot) return cachedRoot;

        return new Response(
            '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stockman</title></head><body style="font-family:system-ui,sans-serif;background:#0f172a;color:white;padding:24px"><h1>Page temporairement indisponible</h1><p>Vérifiez votre connexion, puis réessayez.</p></body></html>',
            {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
        );
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
        .then((response) => {
            if (response && response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);

    return cached || networkPromise;
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            )),
            self.clients.claim(),
        ])
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(navigationFallback(event.request));
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    if (url.pathname.startsWith('/locales/')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    if (url.pathname.startsWith('/_next/static/') || /\.(?:css|js|png|jpg|jpeg|svg|ico|woff2?)$/i.test(url.pathname)) {
        event.respondWith(staleWhileRevalidate(event.request));
        return;
    }

    event.respondWith(networkFirst(event.request));
});
