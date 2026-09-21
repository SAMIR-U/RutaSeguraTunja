const CACHE_ESTATICO = "ruta-segura-static-v2";
const CACHE_DINAMICO = "cache_dinamico";
const APP_SHELL = [
    "./",
    "./index.html",
    "./offline.html",
    "./css/styles.css",
    "./js/datos.js",
    "./js/ui.js",
    "./js/app.js",
    "./img/icon.svg",
];
self.addEventListener("install", (event) => {
    event.waitUntil(instalarServiceWorker());
});
self.addEventListener("activate", (event) => {
    event.waitUntil(activarServiceWorker());
});
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(estrategiaNetworkConCacheFallback(event.request));
});

async function instalarServiceWorker() {
    const cache = await caches.open(CACHE_ESTATICO);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
}
async function activarServiceWorker() {
    const nombresCache = await caches.keys();
    await Promise.all(
        nombresCache
            .filter((nombre) => nombre !== CACHE_ESTATICO)
            .map((nombre) => caches.delete(nombre)),
    );
    await self.clients.claim();
}

async function estrategiaNetworkConCacheFallback(request) {
  try {
    const respuestaRed = await fetch(request);
    if (respuestaRed && (respuestaRed.ok || respuestaRed.type === "opaque")) {
      const cacheDinamico = await caches.open(CACHE_DINAMICO);
      await cacheDinamico.put(request, respuestaRed.clone());

      await limitarCache(CACHE_DINAMICO, LIMITE_CACHE_DINAMICO);

      return respuestaRed;
    }

    throw new Error("Respuesta de red no válida");
  } catch (errorRed) {
    const respuestaCache = await caches.match(request);
    if (respuestaCache) {
      return respuestaCache;
    }
    return manejarRecursoNoDisponible(request);
  }
}

async function manejarRecursoNoDisponible(request) {
    if (request.mode === "navigate") {
        const paginaOffline = await caches.match("./offline.html");
        if (paginaOffline) {
            return paginaOffline;
        }
    }
    if (request.destination === "image") {
        const imagenAlternativa = await
            caches.match("./img/icon.svg");
        if (imagenAlternativa) {
            return imagenAlternativa;
        }
    }
    return new Response("Recurso no disponible en la caché.", {
        status: 504,
        statusText: "Recurso no disponible en caché",
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}