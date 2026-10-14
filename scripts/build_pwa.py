"""Versiona o cache conforme todo o conteúdo necessário para consulta offline."""
import hashlib,re,json,base64
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'service-worker.js'
source=path.read_text(encoding='utf8')
template=re.sub(r"const CACHE = '[^']+';", "const CACHE = 'goias-eleitoral-__VERSION__';",source)
template=re.sub(r'const INTEGRITY = .*?;', 'const INTEGRITY = __INTEGRITY__;',template)
digest=hashlib.sha256(template.encode())
integrity={}
for name in ['index.html','styles.css','model.js','app.js','pwa.js','manifest.webmanifest','data/candidatos.json']:
    data=(root/name).read_bytes()
    if name=='index.html':data=re.sub(rb'data-release="[^"]*"',b'data-release="__RELEASE__"',data)
    digest.update(data)
    integrity[name]='sha256-'+base64.b64encode(hashlib.sha256(data).digest()).decode()
for icon in sorted((root/'icons').glob('*.png')):
    data=icon.read_bytes()
    digest.update(data)
    integrity['icons/'+icon.name]='sha256-'+base64.b64encode(hashlib.sha256(data).digest()).decode()
version=digest.hexdigest()[:16]
index=root/'index.html'
index.write_text(re.sub(r'data-release="[^"]*"','data-release="'+version+'"',index.read_text(encoding='utf8')),encoding='utf8',newline='\n')
integrity['index.html']='sha256-'+base64.b64encode(hashlib.sha256(index.read_bytes()).digest()).decode()
path.write_text(template.replace('__VERSION__',version).replace('__INTEGRITY__',json.dumps(integrity,separators=(',',':'))),encoding='utf8',newline='\n')
print('Cache PWA:',version)
