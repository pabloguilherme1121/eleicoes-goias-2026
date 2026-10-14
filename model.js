"use strict";
(() => {
  const normalize = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  function createModel(payload) {
    if (
      !Array.isArray(payload.candidatos) ||
      !Array.isArray(payload.municipios)
    )
      throw new Error("Base de dados inválida");
    const candidates = payload.candidatos,
      municipalities = payload.municipios;
    const byId = new Map(candidates.map((c) => [c.id, c]));
    if (byId.size !== candidates.length)
      throw new Error("Identificadores duplicados");
    const search = new Map(
      candidates.map((c) => [
        c.id,
        normalize(`${c.nome} ${c.nomeCompleto} ${c.numero} ${c.partido}`),
      ]),
    );
    const votesByCity = municipalities.map(() => new Map());
    const regions = new Map(),
      collator = new Intl.Collator("pt-BR");
    municipalities.forEach((city, index) => {
      for (const [type, field] of [
        ["imediata", "regiaoImediata"],
        ["intermediaria", "regiaoIntermediaria"],
      ]) {
        const region = city[field];
        if (!region) continue;
        const key = `${type}:${region.id}`;
        if (!regions.has(key))
          regions.set(key, {
            key,
            type,
            id: region.id,
            nome: region.nome,
            indices: [],
            total: 0,
          });
        regions.get(key).indices.push(index);
        regions.get(key).total += city.votosNominais;
      }
    });
    for (const c of candidates)
      for (const [city, votes] of c.votacaoMunicipal || [])
        votesByCity[city]?.set(c.id, votes);
    const total = candidates.reduce((sum, c) => sum + (c.votos || 0), 0);
    const scopes = new Map(),
      territories = new Map();
    function scope(city = "", regionKey = "") {
      const index = city === "" ? null : Number(city);
      const municipality =
        index !== null && Number.isInteger(index)
          ? municipalities[index]
          : null;
      if (city !== "" && !municipality) return scope("", regionKey);
      const region = municipality ? null : regions.get(regionKey) || null;
      const key = municipality ? `city:${index}` : region?.key || "state";
      if (scopes.has(key)) return scopes.get(key);
      const aggregated = new Map();
      if (region)
        for (const i of region.indices)
          for (const [id, votes] of votesByCity[i])
            aggregated.set(id, (aggregated.get(id) || 0) + votes);
      const votes = (c) =>
        c.votos == null
          ? null
          : municipality
            ? (votesByCity[index].get(c.id) ?? 0)
            : region
              ? (aggregated.get(c.id) ?? 0)
              : c.votos;
      const ordered = [...candidates].sort(
        (a, b) =>
          (votes(b) ?? -1) - (votes(a) ?? -1) ||
          collator.compare(a.nome, b.nome),
      );
      const ranks = new Map(
        ordered.filter((c) => votes(c) != null).map((c, i) => [c.id, i + 1]),
      );
      const result = {
        municipality,
        region,
        total: municipality?.votosNominais ?? region?.total ?? total,
        label: municipality
          ? municipality.nomeIbge || municipality.nome
          : region
            ? `Região ${region.type === "imediata" ? "imediata" : "intermediária"} de ${region.nome}`
            : "Goiás",
        cityCount: municipality
          ? 1
          : (region?.indices.length ?? municipalities.length),
        votes,
        ordered,
        ranks,
      };
      if (scopes.size >= 32) scopes.delete(scopes.keys().next().value);
      scopes.set(key, result);
      return result;
    }
    function territory(candidate) {
      if (territories.has(candidate.id)) return territories.get(candidate.id);
      const cities = (candidate.votacaoMunicipal || [])
        .map(([index, votos]) => ({
          index,
          municipality: municipalities[index],
          votos,
        }))
        .sort(
          (a, b) =>
            b.votos - a.votos ||
            collator.compare(a.municipality.nome, b.municipality.nome),
        );
      const regional = [...regions.values()]
        .filter((r) => r.type === "intermediaria")
        .map((r) => ({ region: r, votos: scope("", r.key).votes(candidate) }))
        .sort(
          (a, b) =>
            (b.votos ?? -1) - (a.votos ?? -1) ||
            collator.compare(a.region.nome, b.region.nome),
        );
      const result = {
        cities,
        regions: regional,
        topCity: cities[0] || null,
        topRegion: regional.find((r) => (r.votos ?? 0) > 0) || null,
        topThreeVotes: cities.slice(0, 3).reduce((sum, c) => sum + c.votos, 0),
        cityCount: cities.length,
        regionCount: regional.filter((r) => (r.votos ?? 0) > 0).length,
      };
      territories.set(candidate.id, result);
      return result;
    }
    function select(filters = {}) {
      const current = scope(filters.city ?? "", filters.region ?? ""),
        query = normalize(filters.query).trim();
      const found = current.ordered.filter(
        (c) =>
          (filters.view !== "elected" || c.eleito) &&
          (filters.view !== "non" ||
            (!c.eleito && c.situacao !== "Sem resultado informado")) &&
          (!filters.party || c.partido === filters.party) &&
          (!filters.status || c.situacao === filters.status) &&
          (!filters.favoritesOnly || filters.favorites?.has(c.id)) &&
          (!filters.withVotes || (current.votes(c) ?? 0) > 0) &&
          (!query || search.get(c.id).includes(query)),
      );
      if (filters.sort === "name")
        found.sort((a, b) => collator.compare(a.nome, b.nome));
      if (filters.sort === "low")
        found.sort(
          (a, b) =>
            (current.votes(a) ?? Infinity) - (current.votes(b) ?? Infinity) ||
            collator.compare(a.nome, b.nome),
        );
      return found;
    }
    return {
      candidates,
      municipalities,
      byId,
      total,
      regions,
      scope,
      select,
      territory,
    };
  }
  const api = { createModel, normalize };
  globalThis.ElectionCore = api;
  if (typeof module === "object") module.exports = api;
})();
