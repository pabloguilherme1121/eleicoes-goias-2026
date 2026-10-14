"""Empacota HTML autossuficiente e ZIP sem dependências externas de execução."""
import json, zipfile, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(root/'scripts/build_pwa.py')],check=True)
out = root / 'downloads'
out.mkdir(exist_ok=True)
html = (root/'index.html').read_text(encoding='utf-8-sig')
css = (root/'styles.css').read_text(encoding='utf-8-sig')
js = (root/'app.js').read_text(encoding='utf-8-sig')+'\n'+(root/'pwa.js').read_text(encoding='utf8')
data = json.loads((root/'data/candidatos.json').read_text(encoding='utf8'))
assert len(data['candidatos']) == 595
base = 'https://pabloguilherme1121.github.io/eleicoes-goias-2026/'
html = html.replace('<link rel="stylesheet" href="styles.css"><script src="app.js" defer></script>', '<style>'+css+'</style>')
html = html.replace('<script src="pwa.js" defer></script>','').replace('<link rel="manifest" href="manifest.webmanifest">','').replace('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">','')
html = html.replace('href="downloads/', 'href="'+base+'downloads/')
html = html.replace('href="data/candidatos.json"', 'href="#baixar" data-json-download')
payload = json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html = html.replace('</body>', '<script id="embeddedData" type="application/json">'+payload+'</script><script>'+js.replace('</script','<\\/script')+'</script></body>')
portable = out/'painel-goias-2026-offline.html'
portable.write_text(html,encoding='utf8',newline='\n')
with zipfile.ZipFile(out/'eleicoes-goias-2026.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    for name in ('index.html','app.js','pwa.js','service-worker.js','manifest.webmanifest','styles.css','README.md','.gitattributes','.nojekyll','data/candidatos.json','data/proveniencia.json','scripts/import_tse.py','scripts/build_pwa.py','scripts/build_downloads.py','scripts/check_downloads.py','scripts/test_pwa.cjs'):
        z.write(root/name,'eleicoes-goias-2026/'+name)
    for icon in sorted((root/'icons').glob('*.png')):z.write(icon,'eleicoes-goias-2026/icons/'+icon.name)
    z.write(portable,'eleicoes-goias-2026/downloads/'+portable.name)
    z.writestr('LEIA-PRIMEIRO.txt','Abra eleicoes-goias-2026/downloads/painel-goias-2026-offline.html no navegador. O HTML inclui os dados e funciona sem servidor e sem internet. Para desenvolver, siga o README.md. Links de fontes externas e compartilhamento precisam de internet.')
print(f'HTML: {portable.stat().st_size} bytes; ZIP: {(out/"eleicoes-goias-2026.zip").stat().st_size} bytes')
