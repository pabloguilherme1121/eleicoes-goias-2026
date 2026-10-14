"""Valida a entrega offline e o conteúdo do ZIP. Não exige dependências."""
import json, re, zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'downloads/painel-goias-2026-offline.html').read_text(encoding='utf8')
data=json.loads(re.search('<script id="embeddedData" type="application/json">(.*?)</script>',html,re.S).group(1))
assert data==json.loads((root/'data/candidatos.json').read_text(encoding='utf8'))
assert not re.search(r'<(?:script|link)\b[^>]*(?:src|href)="(?:app\.js|styles\.css)',html)
assert len(data['candidatos'])==595
assert sum(c['eleito'] for c in data['candidatos'])==41
assert len({c['id'] for c in data['candidatos']})==595
with zipfile.ZipFile(root/'downloads/eleicoes-goias-2026.zip') as z:
    assert z.testzip() is None
    for name in ('index.html','app.js','styles.css','data/candidatos.json','downloads/painel-goias-2026-offline.html'):
        assert z.read('eleicoes-goias-2026/'+name)==(root/name).read_bytes(),name
print('PASS: HTML independente com base idêntica, 595 registros, 41 eleitos; ZIP íntegro e atualizado.')
