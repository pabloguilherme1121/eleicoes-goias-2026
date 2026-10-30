"""Confere a reconciliação da base municipal e as informações complementares."""
import json
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse
data=json.loads((Path(__file__).resolve().parents[1]/'data/candidatos.json').read_text(encoding='utf8'))
cs=data['candidatos'];cities=data['municipios']
assert len(cities)==246 and len({m['codigo'] for m in cities})==246
assert sum(c['eleito'] for c in cs)==41
assert len({c['id'] for c in cs})==len(cs), 'Candidaturas duplicadas'
provenance=json.loads((Path(__file__).resolve().parents[1]/'data/proveniencia.json').read_text(encoding='utf8'))
with_votes=[c for c in cs if c['votos'] is not None]
missing_votes=[c for c in cs if c['votos'] is None]
assert len(cs)==provenance['registros'], 'Total difere da proveniência'
assert len(with_votes)==provenance['comVotacao'], 'Cobertura difere da proveniência'
assert all(isinstance(c['votos'],int) and c['votos']>=0 for c in with_votes)
assert [c['ranking'] for c in with_votes]==list(range(1,len(with_votes)+1)), 'Ranking nominal inconsistente'
assert all(c['ranking'] is None for c in missing_votes), 'Ausência de votos não pode ter posição'
assert all(a['votos']>=b['votos'] for a,b in zip(with_votes,with_votes[1:])), 'Ordenação de votos inválida'
for c in cs:
    assert type(c['municipiosComVotos']) is int and c['municipiosComVotos'] == len(c['votacaoMunicipal']), f"Contagem de municípios com votos inconsistente: {c['id']}"
    if c['votos'] is not None:assert sum(n for _,n in c['votacaoMunicipal'])==c['votos'],c['id']
    assert len(c['votacaoMunicipal'])==len({i for i,_ in c['votacaoMunicipal']})
    assert all(0<=i<len(cities) and n>0 for i,n in c['votacaoMunicipal'])
    if c['bensDeclarados'] is not None:
        assert sum(Decimal(str(t['valor'])) for t in c['tiposBens'])==Decimal(str(c['bensDeclarados']))
        assert c['quantidadeBens']>0
    for entry in c['redesDeclaradas']:
        if entry['url']:
            parsed=urlparse(entry['url'])
            assert parsed.scheme in ('http','https') and parsed.hostname and not parsed.username and not parsed.password
for i,city in enumerate(cities):assert city['votosNominais']==sum(dict(c['votacaoMunicipal']).get(i,0) for c in cs)
assert sum(m['votosNominais'] for m in cities)==sum(c['votos'] or 0 for c in cs)
print('PASS: 246 municípios; votos reconciliados por candidatura e cidade; bens e links declarados consistentes.')

assert len({m['codigoIbge'] for m in cities})==246
assert len({m['regiaoImediata']['id'] for m in cities})==22
assert len({m['regiaoIntermediaria']['id'] for m in cities})==6
source=json.loads((Path(__file__).resolve().parents[1]/'data/territorios-ibge.json').read_text(encoding='utf8'))
lookup={m['ibge']:m for m in source['municipios']}
for m in cities:
    official=lookup[m['codigoIbge']]
    assert m['nomeIbge']==official['nome']
    assert m['regiaoImediata']==official['imediata'] and m['regiaoIntermediaria']==official['intermediaria']
print('PASS: correspondências IBGE, 22 regiões imediatas e 6 intermediárias verificadas.')
