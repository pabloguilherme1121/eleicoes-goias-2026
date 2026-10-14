'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const source=fs.readFileSync(root+'/service-worker.js','utf8');
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');
for(const icon of manifest.icons){const bytes=fs.readFileSync(root+'/'+icon.src);assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));assert.equal(bytes.readUInt32BE(20),Number(icon.sizes.split('x')[1]));}
function environment(){
 const listeners={},stores=new Map();let offline=false,broken=false,fail='',claimed=0,skipped=0;
 const fetch=async req=>{const url=typeof req==='string'?req:req.url;if(offline||url.includes(fail)&&fail)throw Error('Network unavailable');if(req instanceof Request){const path=new URL(url).pathname.replace('/eleicoes-goias-2026/','');const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(root+'/'+path)).digest('base64');assert.equal(req.integrity,'sha256-'+hash);}return new Response('network:'+url,{status:200});};
 const caches={async open(name){if(broken)throw Error('Storage unavailable');if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async addAll(requests){const entries=await Promise.all(requests.map(async r=>[r.url,await fetch(r)]));entries.forEach(([url,r])=>map.set(url,r));},async match(url){return map.get(url)?.clone();}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const self={location:{href:'https://example.test/eleicoes-goias-2026/service-worker.js'},addEventListener:(name,fn)=>listeners[name]=fn,clients:{claim:async()=>{claimed++;}},skipWaiting:()=>{skipped++;}};
 vm.runInNewContext(source,{self,caches,fetch,Request,Response,URL});
 async function lifecycle(name){let promise;listeners[name]({waitUntil:p=>promise=p});await promise;}
 async function request(url,mode='cors',method='GET'){let result;listeners.fetch({request:{url,mode,method},respondWith:p=>result=p});return result?await result:undefined;}
 async function message(type){let promise,result;listeners.message({data:{type},ports:[{postMessage:value=>result=value}],waitUntil:p=>promise=p});await promise;return result;}
 return {stores,listeners,lifecycle,request,message,offline:v=>offline=v,broken:v=>broken=v,fail:v=>fail=v,claimed:()=>claimed,skipped:()=>skipped};
}
(async()=>{
 const e=environment();await e.lifecycle('install');const key=[...e.stores.keys()][0];assert.equal(e.stores.get(key).size,11);e.stores.set('goias-eleitoral-old',new Map());e.stores.set('other-app-cache',new Map());await e.lifecycle('activate');assert(!e.stores.has('goias-eleitoral-old'));assert(e.stores.has('other-app-cache'));assert.equal(e.claimed(),1);
 e.offline(true);for(const url of ['https://example.test/eleicoes-goias-2026/?view=non&q=Lincoln','https://example.test/eleicoes-goias-2026/index.html?view=elected']){assert.equal((await e.request(url,'navigate')).status,200);}
 assert.equal((await e.request('https://example.test/eleicoes-goias-2026/data/candidatos.json')).status,200);
 assert.equal(await e.request('https://example.test/PG-portfolio/','navigate'),undefined);assert.equal(await e.request('https://external.test/'),undefined);assert.equal(await e.request('https://example.test/eleicoes-goias-2026/downloads/project.zip'),undefined);
 e.listeners.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(e.skipped(),1);
 assert.equal((await e.message('OFFLINE_STATUS')).ok,true);
 const preserved=await e.message('REPAIR_CACHE');assert.equal(preserved.ok,true);assert.equal(preserved.repairFailed,true);
 e.stores.get(key).delete('https://example.test/eleicoes-goias-2026/data/candidatos.json');assert.equal((await e.message('OFFLINE_STATUS')).ok,false);assert.equal((await e.message('REPAIR_CACHE')).ok,false);assert.equal(e.stores.get(key).size,10);
 e.offline(false);assert.equal((await e.message('REPAIR_CACHE')).ok,true);assert.equal(e.stores.get(key).size,11);
 e.offline(false);e.broken(true);assert.equal((await e.request('https://example.test/eleicoes-goias-2026/app.js')).status,200);e.offline(true);assert.equal((await e.request('https://example.test/eleicoes-goias-2026/app.js')).status,503);
 const failed=environment();failed.fail('data/candidatos.json');await assert.rejects(()=>failed.lifecycle('install'));assert.equal(failed.stores.size,0);
 console.log('PASS: manifest/ícones; integridade de todos os recursos; navegação offline; isolamento; atualização; verificação, falha parcial e reparo do cache.');
})().catch(error=>{console.error(error);process.exitCode=1;});
