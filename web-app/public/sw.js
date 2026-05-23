const CACHE_NAME = 'stockman-cache-v5';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
];

async function openCache() {
    if (!self.caches) return null;
    try {
        return await caches.open(CACHE_NAME);
    } catch {
        return null;
    }
}

async function matchCache(request) {
    if (!self.caches) return null;
    try {
        return await caches.match(request);
    } catch {
        return null;
    }
}

async function putCache(request, response) {
    const cache = await openCache();
    if (!cache) return;
    try {
        await cache.put(request, response.clone());
    } catch {
        return;
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            await putCache(request, response);
        }
        return response;
    } catch {
        const cached = await matchCache(request);
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Service temporarily unavailable' });
    }
}

async function navigationFallback(request) {
    try {
        return await fetch(request);
    } catch {
        const cachedRoot = await matchCache('/');
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
    const cache = await openCache();
    const cached = cache ? await cache.match(request).catch(() => null) : null;
    const networkPromise = fetch(request)
        .then((response) => {
            if (response && response.ok) {
                void putCache(request, response);
            }
            return response;
        })
        .catch(() => cached || new Response('', { status: 503, statusText: 'Service temporarily unavailable' }));

    return cached || networkPromise;
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        openCache().then((cache) => cache ? cache.addAll(ASSETS_TO_CACHE).catch(() => undefined) : undefined)
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.caches ? caches.keys().then((cacheNames) => Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name).catch(() => false))
            )).catch(() => undefined) : undefined,
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
