'use strict';
const $ = id => document.getElementById(id);
const fmt = n => n == null ? 'Não informado' : new Intl.NumberFormat('pt-BR').format(n);
const esc = s => String(s ?? 'Não informado').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
let candidates=[],meta={},view='all',page=1;
const selected = new Set();
const size=25;
function filtered(){
 const q=norm($('search').value.trim()), party=$('partyFilter').value,status=$('statusFilter').value;
 return candidates.filter(c=>(view==='all'||(view==='elected'?c.eleito:!c.eleito&&c.situacao!=='Sem resultado informado'))&&(!party||c.partido===party)&&(!status||c.situacao===status)&&(!q||norm(`${c.nome} ${c.nomeCompleto} ${c.numero} ${c.partido}`).includes(q))).sort((a,b)=>$('sort').value==='name'?a.nome.localeCompare(b.nome,'pt-BR'):$('sort').value==='low'?(a.votos??Infinity)-(b.votos??Infinity):(b.votos??-1)-(a.votos??-1));
}
function percentage(c){const total=candidates.reduce((sum,r)=>sum+(r.votos||0),0);return c.votos==null?'Não informado':(100*c.votos/total).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%'}
function render(){
 const found=filtered(),pages=Math.max(1,Math.ceil(found.length/size));page=Math.min(page,pages);
 $('resultCount').textContent=`${fmt(found.length)} de ${fmt(candidates.length)} candidaturas · ${fmt(found.filter(c=>c.eleito).length)} eleitos neste recorte`;
 $('tbody').innerHTML=found.slice((page-1)*size,page*size).map(c=>`<tr><td><input type="checkbox" aria-label="Comparar ${esc(c.nome)}" data-compare="${esc(c.id)}" ${selected.has(c.id)?'checked':''}></td><td class="num">${c.ranking??'—'}</td><td class="name">${esc(c.nome)}<small>Nº ${esc(c.numero)} · ${esc(c.partido)}</small></td><td><span class="badge ${c.eleito?'elected':''}">${esc(c.situacao)}</span></td><td class="num">${fmt(c.votos)}</td><td class="num">${percentage(c)}</td><td><button class="detail-button" data-profile="${esc(c.id)}">Ver perfil</button></td></tr>`).join('');
 $('noResults').hidden=found.length>0;$('pageInfo').textContent=`Página ${page} de ${pages}`;$('prev').disabled=page===1;$('next').disabled=page===pages;$('export').disabled=found.length===0;
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
 renderComparison();
}
function renderComparison(){
 $('compare').hidden=selected.size===0;
 $('compareCards').innerHTML=[...selected].map(id=>{const c=candidates.find(c=>c.id===id);return `<article class="compare-card"><h3>${esc(c.nome)}</h3><p class="muted">${esc(c.partido)} · ${esc(c.numero)}</p><dl>${fields(c).slice(0,7).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><button data-remove="${c.id}">Remover</button></article>`}).join('');
 $('compareHint').textContent=`${selected.size}/3 selecionados para comparação`;
}
function fields(c){return [['Resultado',c.situacao],['Votos nominais',fmt(c.votos)],['Participação nos votos nominais',percentage(c)],['Idade na eleição',c.idade==null?null:c.idade+' anos'],['Ocupação declarada',c.ocupacao],['Escolaridade',c.escolaridade],['Municípios com votos',c.votos==null?null:fmt(c.municipiosComVotos)],['Nome completo',c.nomeCompleto],['Número de urna',c.numero],['Partido',c.nomePartido],['Federação',c.federacao??'Sem federação informada'],['UF de nascimento',c.ufNascimento],['Votos nominais válidos',fmt(c.votosValidos)],['Destinação dos votos',c.destinacao],['Situação do registro',c.registro],['Julgamento da candidatura',c.julgamento]]}
function profile(id){const c=candidates.find(c=>c.id===id);if(!c)return;$('profileName').textContent=c.nome;$('profileSubtitle').textContent=`${c.partido} · Nº ${c.numero}`;$('profileFields').innerHTML=fields(c).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');$('profileCities').innerHTML=c.municipios.length?c.municipios.map(m=>`<div class="city-row"><span>${esc(m.nome)}</span><strong>${fmt(m.votos)} votos</strong></div>`).join(''):'<p class="muted">Sem registro de votação municipal nesta base.</p>';$('profile').showModal()}
function overview(){
 const elected=candidates.filter(c=>c.eleito),non=candidates.filter(c=>!c.eleito&&c.situacao!=='Sem resultado informado'),unknown=candidates.filter(c=>c.situacao==='Sem resultado informado');
 $('totalCandidates').textContent=fmt(candidates.length);$('totalElected').textContent=fmt(elected.length);$('totalNonElected').textContent=fmt(non.length);$('totalUnknown').textContent=fmt(unknown.length);
 $('nonElectedNote').textContent=`${fmt(non.filter(c=>c.situacao==='Suplente').length)} suplentes + ${fmt(non.filter(c=>c.situacao==='Não eleito').length)} não eleitos`;
 $('dataStamp').textContent=`Cadastro: ${meta.cadastroGerado} · Votação: ${meta.votacaoGerada.join(', ')}`;
 const parties=[...new Set(candidates.map(c=>c.partido))].sort();$('partyFilter').innerHTML='<option value="">Todos os partidos</option>'+parties.map(p=>`<option>${esc(p)}</option>`).join('');
 const groups=parties.map(p=>({p,e:elected.filter(c=>c.partido===p).length,n:non.filter(c=>c.partido===p).length})).sort((a,b)=>b.e-a.e||b.n-a.n);const max=Math.max(...groups.map(g=>g.e+g.n));
 $('parties').innerHTML=groups.map(g=>`<div class="bar-row"><button data-party="${esc(g.p)}" aria-label="Filtrar ${esc(g.p)}">${esc(g.p)}</button><div class="track" role="img" aria-label="${esc(g.p)}: ${g.e} eleitos e ${g.n} não eleitos"><i style="width:${100*g.e/max}%"></i><i class="other" style="width:${100*g.n/max}%"></i></div><span class="bar-number">${g.e} / ${g.n}</span></div>`).join('');
 $('ranking').innerHTML=candidates.filter(c=>c.votos!=null).slice(0,10).map((c,i)=>`<li><span class="muted">${i+1}</span><button data-profile="${c.id}">${esc(c.nome)}<small>${esc(c.partido)} · ${esc(c.situacao)}</small></button><strong>${fmt(c.votos)}</strong></li>`).join('');
 const total=candidates.reduce((s,c)=>s+(c.votos||0),0),ev=elected.reduce((s,c)=>s+(c.votos||0),0);$('voteSummary').textContent=`${fmt(total)} votos nominais na base; ${fmt(ev)} destinados aos eleitos (${(100*ev/total).toLocaleString('pt-BR',{maximumFractionDigits:2})}%). Votos de legenda não entram neste denominador.`;
}
function reset(){view='all';page=1;['search','partyFilter','statusFilter'].forEach(id=>$(id).value='');$('sort').value='votes';render()}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.profile)profile(b.dataset.profile);if(b.dataset.view){view=b.dataset.view;$('statusFilter').value='';page=1;render()}if(b.dataset.party){$('partyFilter').value=b.dataset.party;page=1;render();$('consulta').scrollIntoView({behavior:'auto'})}if(b.dataset.remove){selected.delete(b.dataset.remove);render()}});
$('tbody').addEventListener('change',e=>{const id=e.target.dataset.compare;if(!id)return;if(e.target.checked){if(selected.size===3){e.target.checked=false;$('compareHint').textContent='Limite de 3 perfis. Remova um candidato para incluir outro.';return}selected.add(id)}else selected.delete(id);renderComparison()});
['search','partyFilter','statusFilter','sort'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{page=1;render()}));
$('clear').addEventListener('click',reset);$('prev').addEventListener('click',()=>{page--;render()});$('next').addEventListener('click',()=>{page++;render()});$('closeProfile').addEventListener('click',()=>$('profile').close());
$('export').addEventListener('click',()=>{const data=[['Ranking nominal','Nome de urna','Nome completo','Número','Partido','Situação','Votos nominais','Percentual dos votos nominais','Idade na eleição','Ocupação','Escolaridade','Federação','Municípios com votos'],...filtered().map(c=>[c.ranking,c.nome,c.nomeCompleto,c.numero,c.partido,c.situacao,c.votos,percentage(c),c.idade,c.ocupacao,c.escolaridade,c.federacao,c.votos==null?null:c.municipiosComVotos])];const cell=v=>'"'+String(v??'Não informado').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const url=URL.createObjectURL(new Blob(['\uFEFF'+data.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='candidaturas-goias-2026.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
async function load(){try{const response=await fetch('data/candidatos.json');if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();candidates=data.candidatos;meta=data.meta;if(!Array.isArray(candidates)||!candidates.length)throw new Error('Base vazia');overview();render();$('loading').hidden=true;$('content').hidden=false}catch(e){$('loading').innerHTML='<p class="error">Não foi possível carregar os dados. Atualize a página ou tente novamente.</p><button id="retry">Tentar novamente</button>';$('retry').addEventListener('click',load)}}
load();
