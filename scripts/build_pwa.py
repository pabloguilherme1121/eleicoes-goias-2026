"""Versiona o cache conforme todo o conteúdo necessário para consulta offline."""
import hashlib,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'service-worker.js'
source=path.read_text(encoding='utf8')
template=re.sub(r"const CACHE = '[^']+';", "const CACHE = 'goias-eleitoral-__VERSION__';",source)
digest=hashlib.sha256(template.encode())
for name in ['index.html','styles.css','app.js','pwa.js','manifest.webmanifest','data/candidatos.json']:
    digest.update((root/name).read_bytes())
for icon in sorted((root/'icons').glob('*.png')):digest.update(icon.read_bytes())
version=digest.hexdigest()[:16]
path.write_text(template.replace('__VERSION__',version),encoding='utf8',newline='\n')
print('Cache PWA:',version)
