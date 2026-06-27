const CACHE_NAME = "optcg-cache-v1";
const ASSETS = ["./index.html","./app.js","./leaders.js","./manifest.json","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e)=>{
  // No interceptar llamadas a la API externa de líderes
  if(e.request.url.includes("apitcg.com")) return;
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
