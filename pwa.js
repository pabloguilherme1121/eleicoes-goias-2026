'use strict';
(() => {
  const install=document.getElementById('installPwa'),status=document.getElementById('pwaStatus'),update=document.getElementById('updatePwa');
  if(!install||!status||!update)return;
  let prompt=null,registration=null,ready=false;
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function connection(){if(standalone())install.hidden=true;status.textContent=navigator.onLine?'Preparando consulta offline…':'Sem conexão. Consultando os dados salvos neste aparelho.';}
  connection();
  if(location.protocol==='file:'||document.getElementById('embeddedData')){status.textContent='Este HTML já inclui os dados offline. Para instalar o aplicativo, abra o site publicado.';install.hidden=true;return;}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;if(!standalone())install.hidden=false;});
  install.addEventListener('click',async()=>{if(!prompt)return;const current=prompt;prompt=null;install.hidden=true;try{await current.prompt();await current.userChoice;}catch{status.textContent='Use o menu do navegador para instalar o aplicativo.';}});
  window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;status.textContent='Aplicativo instalado. A consulta está disponível na tela inicial.';});
  const onlineStatus=()=>{status.textContent=ready?(navigator.onLine?'Consulta offline pronta neste aparelho.':'Sem conexão. Consultando os dados salvos neste aparelho.'):'O modo offline ainda não foi preparado. Conecte-se e recarregue para tentar novamente.';};
  window.addEventListener('online',()=>{onlineStatus();registration?.update().catch(()=>{});});window.addEventListener('offline',onlineStatus);
  if(!('serviceWorker' in navigator)){status.textContent='Este navegador não oferece consulta offline como aplicativo. Baixe o HTML offline abaixo.';return;}
  const markReady=()=>{ready=true;onlineStatus();};
  navigator.serviceWorker.register('service-worker.js',{scope:'./',updateViaCache:'none'}).then(reg=>{
    registration=reg;
    if(reg.waiting)update.hidden=false;
    if(reg.active)markReady();
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)update.hidden=false;else markReady();}if(worker.state==='redundant'&&!ready)status.textContent='Não foi possível preparar o modo offline. Conecte-se e recarregue para tentar novamente.';});});
    navigator.serviceWorker.ready.then(markReady);
  }).catch(()=>{status.textContent='Modo offline indisponível neste navegador. Você pode baixar o HTML offline.';});
  update.addEventListener('click',()=>{if(registration?.waiting){update.disabled=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}});
  let controlled=Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled)location.reload();controlled=true;});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')registration?.update().catch(()=>{});});
})();
