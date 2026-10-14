'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createModel}=require('../model.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/candidatos.json'),'utf8'));
const model=createModel(data),carol=model.byId.get('90002554683');
assert.equal(model.regions.size,28);assert.equal(model.scope().total,3413641);
for(const type of ['imediata','intermediaria']){
 const regions=[...model.regions.values()].filter(r=>r.type===type);
 assert.equal(regions.reduce((sum,r)=>sum+r.indices.length,0),246);
 assert.equal(regions.reduce((sum,r)=>sum+r.total,0),model.total);
 for(const c of data.candidatos){
  const values=regions.map(r=>model.scope('',r.key).votes(c));
  if(c.votos==null)assert(values.every(v=>v===null));
  else assert.equal(values.reduce((sum,n)=>sum+n,0),c.votos,c.id);
 }
}
const index=data.municipios.findIndex(m=>m.codigoIbge===5200258);
assert(index>=0);assert.equal(model.scope(String(index)).total,80799);assert.equal(model.scope(String(index)).votes(carol),61);
const region=data.municipios[index].regiaoIntermediaria;
assert.match(region.nome,/Luziânia/);const scope=model.scope('',`intermediaria:${region.id}`);
assert.equal(scope.cityCount,34);assert.equal(scope.total,scope.ordered.reduce((sum,c)=>sum+(scope.votes(c)||0),0));
assert.equal(model.scope(String(index),`intermediaria:${region.id}`).votes(carol),61);
const territory=model.territory(carol);assert.equal(territory.topCity.municipality.nomeIbge,'Anápolis');assert.equal(territory.topCity.votos,61717);assert.equal(territory.cities.reduce((sum,c)=>sum+c.votos,0),109002);
assert.equal(territory.regions.reduce((sum,r)=>sum+r.votos,0),109002);
assert(model.select({region:scope.region.key,withVotes:true}).every(c=>scope.votes(c)>0));
assert.equal(model.scope('invalid').total,model.total);
const synthetic=createModel({municipios:[{nome:'A',votosNominais:3,regiaoIntermediaria:{id:1,nome:'R'}}],candidatos:[{id:'missing',nome:'Sem base',votos:null},{id:'zero',nome:'Zero',votos:0,votacaoMunicipal:[]},{id:'known',nome:'Conhecido',votos:3,votacaoMunicipal:[[0,3]]}]});
assert.equal(synthetic.scope('0').votes(synthetic.byId.get('missing')),null);assert.equal(synthetic.scope('0').votes(synthetic.byId.get('zero')),0);assert.equal(synthetic.territory(synthetic.byId.get('zero')).topCity,null);assert(!synthetic.scope('0').ranks.has('missing'));assert.equal(synthetic.select({withVotes:true}).length,1);
console.log('PASS: totais por região e candidatura, município, concentração, filtros, ausência versus zero e precedência territorial.');
