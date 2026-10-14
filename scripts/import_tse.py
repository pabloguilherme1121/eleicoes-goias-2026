"""Gera apenas os campos públicos usados no painel a partir dos CSVs do TSE.
Uso: python scripts/import_tse.py cadastro.csv votacao.csv
"""
import csv, json, sys, collections, datetime, hashlib
from pathlib import Path

def rows(path):
    return csv.DictReader(open(path, encoding='latin1', newline=''), delimiter=';')

cad = {r['SQ_CANDIDATO']: r for r in rows(sys.argv[1]) if r['SG_UF']=='GO' and r['CD_CARGO']=='7' and r['NR_TURNO']=='1'}
votes = collections.Counter()
valid_votes = collections.Counter()
details = {}
cities = collections.defaultdict(collections.Counter)
generation = set()
for r in rows(sys.argv[2]):
    if r['SG_UF']!='GO' or r['CD_CARGO']!='7' or r['NR_TURNO']!='1': continue
    key = r['SQ_CANDIDATO']
    n = int(r['QT_VOTOS_NOMINAIS'])
    votes[key] += n
    valid_votes[key] += int(r['QT_VOTOS_NOMINAIS_VALIDOS'])
    details[key] = {k:r[k] for k in ('DS_DETALHE_SITUACAO_CAND','DS_SITUACAO_JULGAMENTO','NM_TIPO_DESTINACAO_VOTOS')}
    cities[key][r['NM_MUNICIPIO']] += n
    generation.add(r['DT_GERACAO']+' '+r['HH_GERACAO'])

def clean(s):
    return None if s.startswith('#') or s in ('-1','-3','') else s

result = []
for key, r in cad.items():
    birth = datetime.datetime.strptime(r['DT_NASCIMENTO'], '%d/%m/%Y').date() if clean(r['DT_NASCIMENTO']) else None
    election = datetime.date(2026,10,4)
    age = election.year-birth.year-((election.month,election.day)<(birth.month,birth.day)) if birth else None
    code = r['CD_SIT_TOT_TURNO']
    status = {'2':'Eleito por quociente partidário','3':'Eleito por média','4':'Não eleito','5':'Suplente'}.get(code,'Sem resultado informado')
    result.append(dict(id=key,numero=r['NR_CANDIDATO'],nome=r['NM_URNA_CANDIDATO'],nomeCompleto=r['NM_CANDIDATO'],partido=r['SG_PARTIDO'],nomePartido=r['NM_PARTIDO'],federacao=clean(r['NM_FEDERACAO']),situacao=status,eleito=code in ('2','3'),votos=votes.get(key),idade=age,ocupacao=clean(r['DS_OCUPACAO']),escolaridade=clean(r['DS_GRAU_INSTRUCAO']),ufNascimento=clean(r['SG_UF_NASCIMENTO']),municipios=[dict(nome=name,votos=n) for name,n in cities[key].most_common(5)],municipiosComVotos=sum(n>0 for n in cities[key].values())))
    d = details.get(key,{})
    result[-1].update(votosValidos=valid_votes.get(key),registro=clean(d.get('DS_DETALHE_SITUACAO_CAND','')),julgamento=clean(d.get('DS_SITUACAO_JULGAMENTO','')),destinacao=clean(d.get('NM_TIPO_DESTINACAO_VOTOS','')))
result.sort(key=lambda x: (-(x['votos'] or 0),x['nome']))
for i,r in enumerate(result,1): r['ranking']=i if r['votos'] is not None else None
assert sum(r['eleito'] for r in result)==41
assert len(result)==len({r['id'] for r in result})
assert not (set(votes)-set(cad)), 'Votação sem cadastro correspondente'
payload=dict(meta=dict(ano=2026,uf='GO',cargo='Deputado estadual',turno=1,cadastroGerado=next(iter(cad.values()))['DT_GERACAO']+' '+next(iter(cad.values()))['HH_GERACAO'],votacaoGerada=sorted(generation),fontes=['https://dadosabertos.tse.jus.br/dataset/candidatos-2026','https://dadosabertos.tse.jus.br/dataset/resultados-2026'],observacao='Votação nominal agregada por candidato, município e zona. Sem registro de votação é diferente de zero votos. Suplentes não estão entre os 41 eleitos. Idade na data da eleição.'),candidatos=result)
out=Path(__file__).resolve().parents[1]/'data'
out.mkdir(exist_ok=True)
(out/'candidatos.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(out/'proveniencia.json').write_text(json.dumps(dict(fontes=payload['meta']['fontes'],arquivos=[dict(nome=Path(p).name,sha256=hashlib.sha256(Path(p).read_bytes()).hexdigest()) for p in sys.argv[1:3]],registros=len(result),comVotacao=sum(r['votos'] is not None for r in result)),indent=2),encoding='utf8')
print(json.dumps(dict(registros=len(result),situacoes=dict(collections.Counter(r['situacao'] for r in result)),comVotacao=sum(r['votos'] is not None for r in result)),ensure_ascii=True))
