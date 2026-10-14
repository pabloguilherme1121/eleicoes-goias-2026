'use strict';
const CACHE = 'goias-eleitoral-38bdf3ffff5f066c';
const ROOT = new URL('./', self.location.href);
const SHELL = ['index.html','styles.css','app.js','pwa.js','manifest.webmanifest','data/candidatos.json','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
const URLS = SHELL.map(path=>new URL(path,ROOT).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  try { const cache=await caches.open(CACHE);await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload'}))); }
  catch(error){await caches.delete(CACHE).catch(()=>{});throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try {const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('goias-eleitoral-')&&key!==CACHE).map(key=>caches.delete(key)));} catch{}
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  const shellNavigation=request.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===new URL('index.html',ROOT).pathname);
  const key=shellNavigation?new URL('index.html',ROOT).href:url.href;
  if(!shellNavigation&&!URLS.includes(key))return;
  event.respondWith((async()=>{
    try {const cached=await (await caches.open(CACHE)).match(key);if(cached)return cached;} catch{}
    try {return await fetch(request);} catch {return new Response('Conteúdo indisponível offline. Conecte-se para preparar a consulta.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  })());
});
