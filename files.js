'use strict';
(() => {
  const activeUrls = new Set();

  function csv(rows) {
    const cell = value => '"' + String(value ?? 'Não informado').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
  }

  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    activeUrls.add(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Android may hand the Blob to its download manager after the click returns.
    setTimeout(() => { URL.revokeObjectURL(url); activeUrls.delete(url); }, 60000);
  }

  async function save(blob, name, status) {
    if (typeof window.showSaveFilePicker === 'function' && window.isSecureContext) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: name });
        const writer = await handle.createWritable();
        await writer.write(blob);
        await writer.close();
        status.textContent = 'Arquivo salvo.';
        return 'saved';
      } catch (error) {
        if (error.name === 'AbortError') { status.textContent = 'Salvamento cancelado. Seus dados continuam disponíveis.'; return 'cancelled'; }
      }
    }
    triggerDownload(blob, name);
    status.textContent = 'Arquivo preparado. Confira a pasta Downloads do navegador. Se não aparecer, use Compartilhar arquivo.';
    return 'download-requested';
  }

  function canShare(blob, name) {
    try { return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] }); }
    catch { return false; }
  }

  async function share(blob, name, status) {
    if (!canShare(blob, name)) { status.textContent = 'Este navegador não compartilha esse formato. Use Salvar arquivo.'; return; }
    try {
      await navigator.share({ files: [new File([blob], name, { type: blob.type })] });
      status.textContent = 'Arquivo entregue ao compartilhamento do aparelho.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'Compartilhamento cancelado.' : 'Não foi possível compartilhar. Tente Salvar arquivo.';
    }
  }

  async function remote(path, name) {
    const url = new URL(path, document.getElementById('embeddedData') ? 'https://pabloguilherme1121.github.io/eleicoes-goias-2026/' : location.href);
    url.searchParams.set('v', document.documentElement.dataset.release || 'latest');
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Arquivo indisponível: HTTP ' + response.status);
    return { blob: new Blob([await response.arrayBuffer()], { type: name.endsWith('.zip') ? 'application/zip' : 'application/octet-stream' }), name };
  }

  const api = { csv, save, share, canShare, remote, triggerDownload };
  globalThis.ElectionFiles = api;
  if (typeof module === 'object') module.exports = api;
})();
