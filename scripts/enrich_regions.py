"""Enriquece os municípios eleitorais com regiões oficiais do IBGE.
Usa o retrato público versionado; correspondência por nome único e aliases explícitos.
"""
import json, unicodedata, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
ALIASES = {'BOM JESUS': 'BOM JESUS DE GOIAS'}

def normalize(value):
    text = ''.join(c for c in unicodedata.normalize('NFD', value.upper()) if not unicodedata.combining(c))
    return ' '.join(text.replace("'", ' ').replace('’', ' ').split())

def enrich(payload):
    path = ROOT / 'data/territorios-ibge.json'
    source = json.loads(path.read_text(encoding='utf8'))
    lookup = {normalize(m['nome']): m for m in source['municipios']}
    assert len(lookup) == 246, 'Municípios IBGE duplicados ou incompletos'
    matched = set()
    for city in payload['municipios']:
        name = normalize(city['nome'])
        match = lookup[ALIASES.get(name, name)]
        assert match['ibge'] not in matched, 'Correspondência territorial duplicada'
        matched.add(match['ibge'])
        city.update(codigoIbge=match['ibge'],nomeIbge=match['nome'],regiaoImediata=match['imediata'],regiaoIntermediaria=match['intermediaria'])
    assert len(matched) == 246, 'Cobertura territorial incompleta'
    payload['meta']['territorio'] = dict(fonte=source['fonte'],consultadoEm=source['consultadoEm'],municipiosCorrespondidos=len(matched),criterio='Regiões geográficas imediatas e intermediárias do IBGE; nomes únicos normalizados; Bom Jesus (TSE) corresponde a Bom Jesus de Goiás (IBGE).',arquivo='territorios-ibge.json',sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    return payload

if __name__ == '__main__':
    path = ROOT / 'data/candidatos.json'
    data = enrich(json.loads(path.read_text(encoding='utf8')))
    path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8',newline='\n')
    provenance = ROOT / 'data/proveniencia.json'
    info = json.loads(provenance.read_text(encoding='utf8'))
    info['territorio'] = data['meta']['territorio']
    provenance.write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf8',newline='\n')
    print('PASS: 246 municípios associados, sem duplicação, às regiões oficiais do IBGE.')
