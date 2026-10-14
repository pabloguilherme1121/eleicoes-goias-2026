'use strict';
(() => {
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

  function createModel(payload) {
    if (!Array.isArray(payload.candidatos) || !Array.isArray(payload.municipios)) throw new Error('Base de dados inválida');
    const candidates = payload.candidatos;
    const municipalities = payload.municipios;
    const byId = new Map(candidates.map(candidate => [candidate.id, candidate]));
    if (byId.size !== candidates.length) throw new Error('Identificadores duplicados');
    const search = new Map(candidates.map(candidate => [candidate.id, normalize(`${candidate.nome} ${candidate.nomeCompleto} ${candidate.numero} ${candidate.partido}`)]));
    const votesByCity = municipalities.map(() => new Map());
    for (const candidate of candidates) {
      for (const [city, votes] of candidate.votacaoMunicipal || []) votesByCity[city]?.set(candidate.id, votes);
    }
    const total = candidates.reduce((sum, candidate) => sum + (candidate.votos || 0), 0);
    const scopes = new Map();
    const collator = new Intl.Collator('pt-BR');

    function scope(city = '') {
      const key = city === '' ? '' : String(Number(city));
      if (scopes.has(key)) return scopes.get(key);
      const index = key === '' ? null : Number(key);
      const municipality = index === null ? null : municipalities[index];
      if (index !== null && !municipality) return scope('');
      const votes = candidate => candidate.votos == null ? null : index === null ? candidate.votos : votesByCity[index].get(candidate.id) ?? 0;
      const ordered = [...candidates].sort((a, b) => (votes(b) ?? -1) - (votes(a) ?? -1) || collator.compare(a.nome, b.nome));
      const ranks = new Map(ordered.filter(candidate => votes(candidate) != null).map((candidate, position) => [candidate.id, position + 1]));
      const result = { municipality, total: municipality?.votosNominais ?? total, votes, ordered, ranks };
      if (scopes.size >= 8) scopes.delete(scopes.keys().next().value);
      scopes.set(key, result);
      return result;
    }

    function select(filters = {}) {
      const current = scope(filters.city ?? '');
      const query = normalize(filters.query).trim();
      const found = current.ordered.filter(candidate =>
        (filters.view !== 'elected' || candidate.eleito) &&
        (filters.view !== 'non' || (!candidate.eleito && candidate.situacao !== 'Sem resultado informado')) &&
        (!filters.party || candidate.partido === filters.party) &&
        (!filters.status || candidate.situacao === filters.status) &&
        (!filters.favoritesOnly || filters.favorites?.has(candidate.id)) &&
        (!filters.withVotes || (current.votes(candidate) ?? 0) > 0) &&
        (!query || search.get(candidate.id).includes(query))
      );
      if (filters.sort === 'name') found.sort((a, b) => collator.compare(a.nome, b.nome));
      if (filters.sort === 'low') found.sort((a, b) => (current.votes(a) ?? Infinity) - (current.votes(b) ?? Infinity) || collator.compare(a.nome, b.nome));
      return found;
    }

    return { candidates, municipalities, byId, total, scope, select };
  }

  const api = { createModel, normalize };
  globalThis.ElectionCore = api;
  if (typeof module === 'object') module.exports = api;
})();
