'use strict';
const CACHE = 'goias-eleitoral-c1d547b702025f6e';
const INTEGRITY = {"index.html":"sha256-N4tx6oeJv9Y8yR2CI4trMUdwcI2lOiePByj4IHXxhag=","styles.css":"sha256-Pi9b8WdEWHCHGwBzutY97Tso8iZNmx2C6rIAQx9D2ZA=","model.js":"sha256-8gquwSNP44wuvbSB3Uyi3SQMAiFnhs3El4QQH4a111o=","app.js":"sha256-ekG9y03dzMXXGPFmyXOJa5Cvkkt6jvhSnkI4RdSauyI=","pwa.js":"sha256-vsKbSfVfzOayxsD+a+2ndAD2jm1wCpdRCY5al4KkQts=","manifest.webmanifest":"sha256-AVRtCMBTMyeaeZqVAxLKdRTd7b2IHnGawWLKVWO1YvA=","data/candidatos.json":"sha256-By9OtKSxUVDirho9zYl1aX9PJaVgqgtMo6ZarbKy06o=","icons/apple-touch-icon.png":"sha256-MruLIsAB/cd9iMGk95LH8dNS+kPp2JgoF7NFo6iA/g4=","icons/icon-192.png":"sha256-mH7gO0j80Clw+QGauLNNndk1+cwPhAkiqCmXARQc+w4=","icons/icon-512.png":"sha256-CRj4MuWMrWL6tPh96KhbHuBSJA3BHyYZPaadfpCEGs0=","icons/maskable-512.png":"sha256-CRj4MuWMrWL6tPh96KhbHuBSJA3BHyYZPaadfpCEGs0="};
const ROOT = new URL('./', self.location.href);
const SHELL = ['index.html','styles.css','model.js','app.js','pwa.js','manifest.webmanifest','data/candidatos.json','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
const URLS = SHELL.map(path=>new URL(path,ROOT).href);
const shellRequests=()=>SHELL.map(path=>new Request(new URL(path,ROOT),{cache:'reload',integrity:INTEGRITY[path]}));
self.addEventListener('install',event=>event.waitUntil((async()=>{
  try { const cache=await caches.open(CACHE);await cache.addAll(shellRequests()); }
  catch(error){await caches.delete(CACHE).catch(()=>{});throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try {const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('goias-eleitoral-')&&key!==CACHE).map(key=>caches.delete(key)));} catch{}
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE'){self.skipWaiting();return;}
  if(!['OFFLINE_STATUS','REPAIR_CACHE'].includes(event.data?.type))return;
  event.waitUntil((async()=>{
    try {
      const cache=await caches.open(CACHE);
      let repairFailed=false;
      if(event.data.type==='REPAIR_CACHE'){try{await cache.addAll(shellRequests());}catch{repairFailed=true;}}
      const responses=await Promise.all(URLS.map(url=>cache.match(url)));
      const present=responses.filter(Boolean).length;
      const bytes=(await Promise.all(responses.filter(Boolean).map(r=>r.arrayBuffer().then(b=>b.byteLength)))).reduce((a,b)=>a+b,0);
      event.ports?.[0]?.postMessage({ok:present===URLS.length,repairFailed,version:CACHE,files:present,expected:URLS.length,bytes});
    } catch {event.ports?.[0]?.postMessage({ok:false,error:'Não foi possível verificar ou reparar os arquivos offline.'});}
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  const shellNavigation=request.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===new URL('index.html',ROOT).pathname);
  const key=shellNavigation?new URL('index.html',ROOT).href:url.href;
  if(!shellNavigation&&!URLS.includes(key))return;
  event.respondWith((async()=>{
    try {const cached=await (await caches.open(CACHE)).match(key);if(cached)return cached;} catch{}
    const path=SHELL[URLS.indexOf(key)];
    try {return await fetch(new Request(key,{cache:'reload',integrity:INTEGRITY[path]}));} catch {return new Response('Conteúdo indisponível nesta versão. Conecte-se e atualize o aplicativo para preparar a consulta.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  })());
});
