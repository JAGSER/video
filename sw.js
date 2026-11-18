const C="mnt-v3";const A=["./","index.html","manifest.json","a/Inter-Black.otf","a/Inter-Bold.otf","a/Lora-Italic-Variable.ttf","a/pop.wav","a/thud.wav","a/whoosh.wav","a/icon192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!="GET"||u.origin!=location.origin||/demo\.mp4$/.test(u.pathname))return;
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
