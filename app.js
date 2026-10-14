"use strict";
const $ = (id) => document.getElementById(id);
const numberFormat = new Intl.NumberFormat("pt-BR");
const fmt = (n) => (n == null ? "Não informado" : numberFormat.format(n));
let model = null,
  profileLimit = 20,
  chartMode = "seats",
  profileInvoker = null,
  restoringLocation = false;
const moneyFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
function icon(name) {
  const paths = {
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z",
    close: "m6 6 12 12M6 18 18 6",
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
}
function displayName(value) {
  return String(value)
    .toLocaleLowerCase("pt-BR")
    .replace(
      /(^|[\s.-])([\p{L}])/gu,
      (_, space, letter) => space + letter.toLocaleUpperCase("pt-BR"),
    )
    .replace(/\s(Da|De|Do|Das|Dos|E)\s/g, (match) =>
      match.toLocaleLowerCase("pt-BR"),
    )
    .replace(/\bGcm\b/g, "GCM");
}
const esc = (s) =>
  String(s ?? "Não informado").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const norm = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
let candidates = [],
  meta = {},
  municipalities = [],
  stateTotal = 0,
  view = "all",
  page = 1,
  currentProfile = null;
let favorites = new Set();
try {
  const saved = JSON.parse(preference("favorites") || "[]");
  if (Array.isArray(saved))
    favorites = new Set(saved.filter((id) => typeof id === "string"));
} catch {}
let favoritesPersisted = true;
const selected = new Set();
let comparisonSignature = "";
let savedCityCode = preference("city") || "",
  cityIsPersistent = true;
function pageSize() {
  return [50, 100, 150].includes(Number($("pageSize").value))
    ? Number($("pageSize").value)
    : Math.max(1, candidates.length);
}
function filtered() {
  if (!$("minVotes").validity.valid || !$("maxVotes").validity.valid) return [];
  return model
    ? model.select({
        city: $("municipalityFilter").value,
        region: $("regionFilter").value,
        query: $("search").value,
        view,
        party: $("partyFilter").value,
        status: $("statusFilter").value,
        sort: $("sort").value,
        favoritesOnly: $("favoritesOnly").checked,
        favorites,
        withVotes: $("withVotesOnly").checked,
        age: $("ageFilter").value,
        data: $("dataFilter").value,
        minVotes: $("minVotes").value,
        maxVotes: $("maxVotes").value,
      })
    : [];
}
function currentScope() {
  return model.scope($("municipalityFilter").value, $("regionFilter").value);
}
function regionContains(index) {
  const region = model.regions.get($("regionFilter").value);
  return !region || region.indices.includes(index);
}
function renderMunicipalityOptions() {
  const selected = $("municipalityFilter").value,
    q = norm($("municipalitySearch").value.trim());
  $("municipalityFilter").innerHTML =
    '<option value="">' +
    ($("regionFilter").value ? "Toda a região" : "Todo o estado") +
    "</option>" +
    municipalities
      .map((m, i) => ({ m, i }))
      .filter(
        ({ m, i }) =>
          regionContains(i) &&
          (!q ||
            norm(m.nomeIbge || m.nome).includes(q) ||
            String(i) === selected),
      )
      .map(
        ({ m, i }) =>
          `<option value="${i}">${esc(m.nomeIbge || m.nome)}</option>`,
      )
      .join("");
  $("municipalityFilter").value = [...$("municipalityFilter").options].some(
    (o) => o.value === selected,
  )
    ? selected
    : "";
}
function renderRegionOptions() {
  const ordered = [...model.regions.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
  $("regionFilter").innerHTML =
    '<option value="">Todo o estado</option>' +
    [
      ["intermediaria", "Regiões intermediárias · visão ampla"],
      ["imediata", "Regiões imediatas · visão local"],
    ]
      .map(
        ([type, label]) =>
          `<optgroup label="${label}">${ordered
            .filter((r) => r.type === type)
            .map((r) => `<option value="${r.key}">${esc(r.nome)}</option>`)
            .join("")}</optgroup>`,
      )
      .join("");
}
$("municipalitySearch").addEventListener("input", renderMunicipalityOptions);
$("regionFilter").addEventListener("change", () => {
  $("municipalityFilter").value = "";
  $("municipalitySearch").value = "";
  page = 1;
  renderMunicipalityOptions();
  render();
});
function currentCity() {
  return currentScope().municipality;
}
function votesFor(c) {
  return currentScope().votes(c);
}
function rankFor(c) {
  return currentScope().ranks.get(c.id);
}
function pct(value, total) {
  return value == null
    ? "Não informado"
    : total > 0
      ? ((100 * value) / total).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + "%"
      : "Sem base percentual";
}
function percentage(c, state = false) {
  return pct(
    state ? c.votos : votesFor(c),
    state ? stateTotal : currentScope().total,
  );
}
function money(n) {
  return n == null ? "Sem registro na base" : moneyFormat.format(n);
}
function render() {
  validateVoteRange();
  const scope = currentScope();
  $("territorySelection").textContent = scope.label;
  $("scopeNote").textContent =
    `${scope.label} · ${fmt(scope.total)} votos nominais · resultado estadual`;
  renderScopeReading(scope);
  const size = pageSize(),
    found = filtered(),
    pages = Math.max(1, Math.ceil(found.length / size));
  page = Math.min(page, pages);
  const electedCount = found.filter((c) => c.eleito).length;
  $("resultCount").textContent =
    `${found.length ? fmt((page - 1) * size + 1) + "–" + fmt(Math.min(page * size, found.length)) : "0"} de ${fmt(found.length)} ${found.length === 1 ? "resultado" : "resultados"} · ${fmt(candidates.length)} registros na base · ${fmt(electedCount)} ${electedCount === 1 ? "eleito" : "eleitos"} na lista`;
  $("tbody").innerHTML = window.matchMedia?.("(max-width:760px)").matches
    ? ""
    : found
        .slice((page - 1) * size, page * size)
        .map(
          (c) =>
            `<tr><td><input type="checkbox" aria-label="Comparar ${esc(c.nome)}" data-compare="${esc(c.id)}" ${selected.has(c.id) ? "checked" : ""}></td><td class="num">${rankFor(c) ?? "—"}</td><td class="name">${esc(displayName(c.nome))}<small>Nº ${esc(c.numero)} · ${esc(c.partido)}</small><small class="candidate-bio">${candidateBio(c)}</small><small class="candidate-territory">${territoryLabel(c)}</small></td><td><span class="badge ${c.eleito ? "elected" : ""}">${esc(c.situacao)}</span></td><td class="num">${fmt(votesFor(c))}</td><td class="num">${percentage(c)}</td><td><button class="detail-button" data-profile="${esc(c.id)}">Ver perfil</button></td></tr>`,
        )
        .join("");
  $("candidateCards").innerHTML = !window.matchMedia?.("(max-width:760px)")
    .matches
    ? ""
    : found
        .slice((page - 1) * size, page * size)
        .map(
          (c) =>
            `<article class="candidate-card"><span class="card-rank">${rankFor(c) ? "#" + rankFor(c) + " no ranking nominal" : "Sem posição no ranking"}</span><h3>${esc(displayName(c.nome))}</h3><p class="identity">${esc(c.partido)} · Nº ${esc(c.numero)}</p><p class="candidate-bio">${candidateBio(c)}</p><span class="badge ${c.eleito ? "elected" : ""}">${esc(c.situacao)}</span><p class="candidate-territory">${territoryLabel(c)}</p><div class="card-votes"><div><small>Votos nominais</small><strong>${fmt(votesFor(c))}</strong></div><div class="percent"><small>Do total nominal do recorte</small><strong>${percentage(c)}</strong></div></div><div class="card-controls"><button data-profile="${c.id}" aria-label="Ver perfil de ${esc(c.nome)}">Ver perfil</button><label><input type="checkbox" data-compare="${c.id}" ${selected.has(c.id) ? "checked" : ""}><span>Comparar</span><span class="sr-only"> ${esc(c.nome)} (${esc(c.numero)})</span></label></div><button class="favorite-button" data-favorite="${c.id}" aria-pressed="${favorites.has(c.id)}" aria-label="${favorites.has(c.id) ? "Remover favorito" : "Salvar favorito"}: ${esc(c.nome)}">${icon("star")}${favorites.has(c.id) ? "Favorito salvo" : "Salvar favorito"}</button></article>`,
        )
        .join("");
  $("mobileEmpty").hidden = found.length > 0;
  $("noResults").hidden = found.length > 0;
  $("pageInfo").textContent = `Página ${page} de ${pages}`;
  $("prev").disabled = page === 1;
  $("next").disabled = page === pages;
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === view));
  $("favoriteCount").textContent =
    `${favorites.size} ${favoritesPersisted ? "salvos no aparelho" : "nesta sessão"}`;
  refreshSavedCity();
  $("candidatesCaption").textContent =
    `Candidaturas em ${scope.label}, ordenadas por ${$("sort").selectedOptions[0].textContent.toLocaleLowerCase("pt-BR")}. Ranking nominal considera todo o território.`;
  renderActiveFilters();
  renderComparison();
  renderAnalysis();
  syncUrl();
}
function renderComparison() {
  const signature = JSON.stringify([
    Array.from(selected),
    $("regionFilter").value,
    $("municipalityFilter").value,
  ]);
  if (signature !== comparisonSignature) {
    $("comparisonStatus").textContent = "";
    $("comparisonFallback").hidden = true;
    comparisonSignature = signature;
  }
  $("compare").hidden = selected.size === 0;
  $("compareJump").hidden = selected.size === 0;
  document.querySelectorAll("[data-compare]").forEach((input) => {
    input.checked = selected.has(input.dataset.compare);
  });
  $("compareCards").innerHTML = [...selected]
    .map((id) => {
      const c = candidates.find((c) => c.id === id);
      return `<article class="compare-card"><h3>${esc(displayName(c.nome))}</h3><p class="muted">${esc(c.partido)} · ${esc(c.numero)}</p><dl>${comparisonFields(
        c,
      )
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
        .join(
          "",
        )}</dl><div class="comparison-actions"><button data-profile="${c.id}">Abrir perfil</button><button data-remove="${c.id}" aria-label="Remover ${esc(c.nome)} da comparação">Remover</button></div></article>`;
    })
    .join("");
  $("compareHint").textContent =
    `${selected.size}/3 selecionados para comparação`;
  $("compareTray").hidden = selected.size === 0;
  $("compareTrayCount").textContent = `${selected.size}/3 perfis`;
  document.body.classList.toggle("has-comparison", selected.size > 0);
}
function fields(c) {
  return [
    ["Resultado", c.situacao],
    ["Situação do julgamento (TSE)", c.julgamento ?? "Não informada"],
    ["Votos nominais estaduais", fmt(c.votos)],
    ["Participação nominal estadual", percentage(c, true)],
    ["Idade na eleição", c.idade == null ? null : c.idade + " anos"],
    ["Ocupação declarada", c.ocupacao],
    ["Escolaridade", c.escolaridade],
    [
      "Municípios com votos",
      c.votos == null ? null : fmt(c.municipiosComVotos),
    ],
    ["Nome completo", c.nomeCompleto],
    ["Número de urna", c.numero],
    ["Partido", c.nomePartido],
    ["Federação", c.federacao ?? "Sem federação informada"],
    ["UF de nascimento", c.ufNascimento],
    ["Votos nominais válidos", fmt(c.votosValidos)],
    ["Destinação dos votos", c.destinacao],
  ];
}
function profile(id, writeHistory = true) {
  const wasOpen = $("profile").open;
  if (!wasOpen) profileInvoker = document.activeElement;
  const c = candidates.find((c) => c.id === id);
  if (!c) return;
  currentProfile = c;
  $("profileName").textContent = displayName(c.nome);
  $("profileShareStatus").textContent = "";
  $("profileShareFallback").hidden = true;
  $("profileSubtitle").textContent = `${c.partido} · Nº ${c.numero}`;
  $("profileFields").innerHTML = fields(c)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
    .join("");
  $("profileCitySearch").value = "";
  profileLimit = 20;
  $("profileSummary").innerHTML =
    `<div><span>Votos estaduais</span><strong>${fmt(c.votos)}</strong></div><div><span>Do total nominal estadual</span><strong>${percentage(c, true)}</strong></div><div><span>Resultado</span><strong>${esc(c.situacao)}</strong></div>`;
  const legalStatus = [];
  if (c.julgamento && c.julgamento !== "DEFERIDO")
    legalStatus.push("Julgamento: " + c.julgamento);
  if (c.destinacao && c.destinacao !== "Válido")
    legalStatus.push("Destinação dos votos: " + c.destinacao);
  $("profileLegalNotice").hidden = legalStatus.length === 0;
  $("profileLegalNotice").textContent = legalStatus.length
    ? `${legalStatus.join(" · ")}. Informação da base TSE de ${meta.votacaoGerada?.[0] || meta.cadastroGerado || "data não informada"}. Verifique a situação atual na fonte oficial.`
    : "";
  renderProfileTerritory();
  renderProfileExtras();
  document.body.classList.add("modal-open");
  if (!wasOpen) $("profile").showModal();
  else $("profile").scrollTop = 0;
  renderProfileNavigation();
  if (!writeHistory) syncUrl();
  if (writeHistory) {
    const url = new URL(location.href);
    url.searchParams.set("perfil", c.id);
    try {
      history[wasOpen ? "replaceState" : "pushState"](
        { profile: c.id },
        "",
        url.href,
      );
    } catch {}
  }
}
function overview() {
  const elected = candidates.filter((c) => c.eleito),
    non = candidates.filter(
      (c) => !c.eleito && c.situacao !== "Sem resultado informado",
    ),
    unknown = candidates.filter(
      (c) => c.situacao === "Sem resultado informado",
    );
  $("totalCandidates").textContent = fmt(candidates.length);
  $("totalElected").textContent = fmt(elected.length);
  $("totalNonElected").textContent = fmt(non.length);
  $("totalUnknown").textContent = fmt(unknown.length);
  const withoutVotes = candidates.filter((c) => c.votos == null);
  const otherStatuses = withoutVotes.filter((c) => c.situacao !== "Sem resultado informado");
  $("noVotesNote").textContent = `${fmt(withoutVotes.length)} sem votação registrada, inclusive ${fmt(otherStatuses.length)} com outra situação eleitoral`;
  $("nonElectedNote").textContent =
    `${fmt(non.filter((c) => c.situacao === "Suplente").length)} suplentes + ${fmt(non.filter((c) => c.situacao === "Não eleito").length)} não eleitos`;
  $("dataStamp").textContent = "Fonte TSE · base de 13/10/2026";
  $("dataPeriods").textContent =
    `Cadastro: ${meta.cadastroGerado} · Votação: ${meta.votacaoGerada.join(", ")} · Bens: ${meta.geracaoComplementar?.bens} · Redes: ${meta.geracaoComplementar?.redes}`;
  $("territorySource").textContent =
    `IBGE consultado em ${meta.territorio?.consultadoEm || "data não informada"} · ${meta.territorio?.municipiosCorrespondidos || 0} municípios associados. Datas eleitorais permanecem as do TSE.`;
  $("dataCoverage").textContent =
    `${fmt(candidates.filter((c) => c.votos != null).length)} registros com votação; ${fmt(candidates.filter((c) => c.votos == null).length)} sem registro de votos. ${municipalities.length} municípios. Esta é uma base datada, não apuração ao vivo.`;
  renderRegionOptions();
  renderMunicipalityOptions();
  const parties = [...new Set(candidates.map((c) => c.partido))].sort();
  $("partyFilter").innerHTML =
    '<option value="">Todos os partidos</option>' +
    parties.map((p) => `<option>${esc(p)}</option>`).join("");
  const ages = elected
      .map((c) => c.idade)
      .filter((n) => n != null)
      .sort((a, b) => a - b),
    median = ages.length
      ? (ages[Math.floor((ages.length - 1) / 2)] +
          ages[Math.ceil((ages.length - 1) / 2)]) /
        2
      : null;
  $("insights").innerHTML = [
    [
      "Municípios na base",
      fmt(municipalities.length),
      "Votação nominal por cidade",
    ],
    [
      "Idade mediana dos eleitos",
      median == null ? "Não informado" : fmt(median) + " anos",
      ages.length + " dos " + elected.length + " perfis com idade",
    ],
    [
      "Bens declarados na base",
      fmt(candidates.filter((c) => c.bensDeclarados != null).length),
      "Registros com pelo menos um bem informado",
    ],
    [
      "Redes declaradas",
      fmt(candidates.filter((c) => c.redesDeclaradas?.length).length),
      "Registros com endereço ou handle informado",
    ],
  ]
    .map(
      ([label, value, note]) =>
        `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`,
    )
    .join("");
}
function reset() {
  view = "all";
  page = 1;
  [
    "search",
    "partyFilter",
    "statusFilter",
    "regionFilter",
    "municipalityFilter",
    "municipalitySearch",
    "ageFilter",
    "dataFilter",
    "minVotes",
    "maxVotes",
  ].forEach((id) => ($(id).value = ""));
  $("sort").value = "votes";
  $("favoritesOnly").checked = false;
  $("withVotesOnly").checked = false;
  renderMunicipalityOptions();
  render();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-reset")) {
    reset();
    return;
  }
  if (b.dataset.clearFilter) {
    clearFilter(b.dataset.clearFilter);
    return;
  }
  if (b.dataset.region) chooseTerritory(b.dataset.region);
  if (b.dataset.city) chooseTerritory("", b.dataset.city);
  if (b.dataset.profile) profile(b.dataset.profile);
  if (b.dataset.favorite) toggleFavorite(b.dataset.favorite);
  if (b.dataset.view) {
    view = b.dataset.view;
    $("statusFilter").value = "";
    page = 1;
    render();
  }
  if (b.dataset.party) {
    $("partyFilter").value = b.dataset.party;
    page = 1;
    render();
    $("consulta").scrollIntoView({ behavior: "auto" });
  }
  if (b.dataset.remove) {
    selected.delete(b.dataset.remove);
    render();
  }
});
document.addEventListener("change", (e) => {
  const id = e.target.dataset.compare;
  if (!id) return;
  if (e.target.checked) {
    if (selected.size === 3) {
      e.target.checked = false;
      $("compareHint").textContent =
        "Limite de 3 perfis. Remova um candidato para incluir outro.";
      $("compareTrayCount").textContent = "Limite de 3 perfis";
      return;
    }
    selected.add(id);
  } else selected.delete(id);
  renderComparison();
  syncUrl();
});
[
  "search",
  "partyFilter",
  "statusFilter",
  "sort",
  "municipalityFilter",
  "favoritesOnly",
  "withVotesOnly",
  "ageFilter",
  "dataFilter",
  "minVotes",
  "maxVotes",
  "pageSize",
].forEach((id) =>
  $(id).addEventListener(id === "search" ? "input" : "change", () => {
    page = 1;
    render();
  }),
);
$("clear").addEventListener("click", reset);
function changePage(step) {
  page += step;
  render();
  if (window.matchMedia?.("(max-width:760px)").matches)
    $("consulta").scrollIntoView({ behavior: "auto" });
}
$("prev").addEventListener("click", () => changePage(-1));
$("next").addEventListener("click", () => changePage(1));
$("closeProfile").addEventListener("click", () => $("profile").close());
async function load() {
  const requestedProfile = new URLSearchParams(location.search).get("perfil");
  try {
    let data;
    const embedded = $("embeddedData");
    if (embedded) {
      data = JSON.parse(embedded.textContent);
    } else {
      const response = await fetch(
        document.documentElement.dataset.recovery
          ? "data/candidatos.json?v=" + document.documentElement.dataset.release
          : "data/candidatos.json",
      );
      if (!response.ok) throw new Error("HTTP " + response.status);
      data = await response.json();
    }
    candidates = data.candidatos;
    $("pageSize").querySelector('[value="all"]').textContent =
      `Todos (${fmt(candidates.length)})`;
    meta = data.meta;
    municipalities = data.municipios || [];
    model = ElectionCore.createModel(data);
    stateTotal = candidates.reduce((sum, c) => sum + (c.votos || 0), 0);
    favorites = new Set(
      [...favorites].filter((id) => candidates.some((c) => c.id === id)),
    );
    if (!Array.isArray(candidates) || !candidates.length)
      throw new Error("Base vazia");
    overview();
    restoreFilters();
    $("territoryPanel").open = Boolean(
      $("regionFilter").value || $("municipalityFilter").value,
    );
    render();
    $("loading").hidden = true;
    $("content").hidden = false;
    if (requestedProfile) profile(requestedProfile, false);
  } catch (e) {
    $("loading").innerHTML =
      '<p class="error">Não foi possível carregar os dados. Atualize a página ou tente novamente.</p><button id="retry">Tentar novamente</button>';
    $("retry").addEventListener("click", load);
  }
}
$("profile").addEventListener("close", () => {
  if ($("profile").open) return;
  document.body.classList.remove("modal-open");
  if (!restoringLocation) {
    const url = new URL(location.href);
    url.searchParams.delete("perfil");
    try {
      history.replaceState(null, "", url.href);
    } catch {}
  }
  if (profileInvoker?.isConnected)
    profileInvoker.focus({ preventScroll: true });
  else $("search").focus({ preventScroll: true });
});
$("printProfile").addEventListener("click", () => window.print());
document.querySelectorAll("[data-start]").forEach((button) =>
  button.addEventListener("click", () => {
    reset();
    view = button.dataset.start;
    render();
    $("consulta").scrollIntoView();
    $("search").focus({ preventScroll: true });
  }),
);
function queryValues() {
  const city = $("municipalityFilter").value;
  return {
    perfil: $("profile").open ? currentProfile?.id || "" : "",
    favoritos: $("favoritesOnly").checked ? "1" : "",
    comparar: [...selected].join(","),
    view: view === "all" ? "" : view,
    q: $("search").value.trim(),
    party: $("partyFilter").value,
    status: $("statusFilter").value,
    regiao: $("regionFilter").value,
    cidade: city === "" ? "" : String(municipalities[Number(city)].codigoIbge),
    comvotos: $("withVotesOnly").checked ? "1" : "",
    sort: $("sort").value === "votes" ? "" : $("sort").value,
    idade: $("ageFilter").value,
    dados: $("dataFilter").value,
    minimo: $("minVotes").value,
    maximo: $("maxVotes").value,
    itens: $("pageSize").value === "all" ? "" : $("pageSize").value,
    page: page === 1 ? "" : String(page),
  };
}
function syncUrl() {
  if (!/^https?:$/.test(location.protocol)) return;
  const url = new URL(location.href);
  url.searchParams.delete("municipio");
  for (const [key, value] of Object.entries(queryValues())) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  try {
    history.replaceState(null, "", url.href);
  } catch {}
}
function restoreFilters() {
  const params = new URLSearchParams(location.search);
  $("pageSize").value = "all";
  if (["all", "elected", "non"].includes(params.get("view")))
    view = params.get("view");
  $("search").value = params.get("q") || "";
  const requestedPage = Number(params.get("page"));
  if (Number.isInteger(requestedPage) && requestedPage > 0)
    page = requestedPage;
  for (const [id, key] of [
    ["partyFilter", "party"],
    ["statusFilter", "status"],
    ["sort", "sort"],
    ["regionFilter", "regiao"],
    ["ageFilter", "idade"],
    ["dataFilter", "dados"],
    ["pageSize", "itens"],
  ]) {
    const value = params.get(key);
    if (value && [...$(id).options].some((o) => o.value === value))
      $(id).value = value;
  }
  for (const [id, key] of [
    ["minVotes", "minimo"],
    ["maxVotes", "maximo"],
  ]) {
    const value = params.get(key);
    $(id).value = value && /^\d{1,12}$/.test(value) ? value : "";
  }
  renderMunicipalityOptions();
  let city = params.get("cidade")
    ? String(
        municipalities.findIndex(
          (m) => String(m.codigoIbge) === params.get("cidade"),
        ),
      )
    : params.get("municipio");
  if (
    city != null &&
    [...$("municipalityFilter").options].some((o) => o.value === city)
  )
    $("municipalityFilter").value = city;
  $("withVotesOnly").checked = params.get("comvotos") === "1";
  $("favoritesOnly").checked = params.get("favoritos") === "1";
  selected.clear();
  for (const id of (params.get("comparar") || "").split(",")) {
    if (selected.size === 3) break;
    if (model.byId.has(id)) selected.add(id);
  }
}
$("shareFilters").addEventListener("click", async () => {
  const url = new URL(
    "https://pabloguilherme1121.github.io/eleicoes-goias-2026/",
  );
  for (const [k, v] of Object.entries(queryValues()))
    if (v && k !== "favoritos" && k !== "perfil") url.searchParams.set(k, v);
  url.hash = "consulta";
  try {
    await navigator.clipboard.writeText(url.href);
    $("shareStatus").textContent =
      "Link copiado com os filtros territoriais. Favoritos ficam neste aparelho.";
    $("shareFallback").hidden = true;
  } catch {
    $("shareFallback").hidden = false;
    $("shareLink").value = url.href;
    $("shareLink").focus();
    $("shareLink").select();
    $("shareStatus").textContent =
      "Copie o link selecionado para compartilhar a consulta.";
  }
});
function savePreference(key, value) {
  try {
    localStorage.setItem("goias-" + key, value);
  } catch {}
}
function preference(key) {
  try {
    return localStorage.getItem("goias-" + key);
  } catch {
    return null;
  }
}
function setTheme(value) {
  document.documentElement.dataset.theme = value;
  const light = value === "light";
  $("themeToggle").textContent = light ? "Tema escuro" : "Tema claro";
  $("themeToggle").setAttribute("aria-pressed", light);
}
function setContrast(value) {
  document.documentElement.dataset.contrast = value;
  $("contrastToggle").setAttribute("aria-pressed", value === "high");
}
function setReading(value) {
  $("readingMode").value = value;
  document
    .querySelectorAll(".explained-only")
    .forEach((e) => (e.hidden = value !== "explained"));
}
setTheme(preference("theme") === "light" ? "light" : "dark");
setContrast(preference("contrast") === "high" ? "high" : "normal");
setReading(preference("reading") === "explained" ? "explained" : "summary");
$("themeToggle").addEventListener("click", () => {
  const value =
    document.documentElement.dataset.theme === "light" ? "dark" : "light";
  setTheme(value);
  savePreference("theme", value);
});
$("contrastToggle").addEventListener("click", () => {
  const value =
    document.documentElement.dataset.contrast === "high" ? "normal" : "high";
  setContrast(value);
  savePreference("contrast", value);
});
$("readingMode").addEventListener("change", () => {
  setReading($("readingMode").value);
  savePreference("reading", $("readingMode").value);
});
const navLinks = [...document.querySelectorAll(".mobile-nav a")];
function activeNav(id) {
  if (id === "baixar") id = "aplicativo";
  navLinks.forEach((link) => {
    if (link.hash === "#" + id) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
activeNav(location.hash.slice(1) || "inicio");
window.addEventListener("hashchange", () =>
  activeNav(location.hash.slice(1) || "inicio"),
);
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) activeNav(visible.target.id);
    },
    { rootMargin: "-10% 0px -60% 0px", threshold: [0, 0.1, 0.5] },
  );
  ["inicio", "consulta", "analise", "aplicativo", "fontes"].forEach((id) =>
    observer.observe($(id)),
  );
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  try {
    localStorage.setItem("goias-favorites", JSON.stringify([...favorites]));
    favoritesPersisted = true;
  } catch {
    favoritesPersisted = false;
  }
  render();
  if (currentProfile) {
    renderProfileTerritory();
    renderProfileExtras();
    renderProfileNavigation();
  }
}
function renderProfileCities() {
  const c = currentProfile;
  if (!c) return;
  const q = norm($("profileCitySearch").value),
    list = model
      .territory(c)
      .cities.filter((m) =>
        norm(m.municipality.nomeIbge || m.municipality.nome).includes(q),
      );
  $("profileCitiesCount").textContent =
    c.votos == null
      ? "Sem registro de votação; distribuição municipal indisponível."
      : `${list.length} municípios com votos${q ? " na busca" : ""} · percentuais abaixo usam o total estadual desta candidatura`;
  $("profileCitiesMore").hidden = list.length <= profileLimit;
  $("profileCities").innerHTML = list.length
    ? list
        .slice(0, profileLimit)
        .map(
          (m) =>
            `<div class="city-row territorial-row"><div><button data-city="${m.index}" aria-label="Consultar votação em ${esc(m.municipality.nomeIbge || m.municipality.nome)}">${esc(m.municipality.nomeIbge || m.municipality.nome)}</button><small>Região imediata de ${esc(m.municipality.regiaoImediata.nome)}</small></div><div><strong>${fmt(m.votos)} votos</strong><small>${pct(m.votos, c.votos)} dos votos da candidatura</small></div></div>`,
        )
        .join("")
    : '<p class="muted">' +
      (c.votos == null
        ? "Sem dados municipais disponíveis."
        : c.votos === 0
          ? "Nenhum voto nominal registrado."
          : "Nenhum município com votos corresponde à busca.") +
      "</p>";
}
function renderProfileExtras() {
  const c = currentProfile;
  if (!c) return;
  $("profileAssetShort").textContent = money(c.bensDeclarados);
  $("favoriteProfile").textContent = favorites.has(c.id)
    ? "Remover favorito"
    : "Salvar favorito";
  $("favoriteProfile").setAttribute("aria-pressed", favorites.has(c.id));
  $("profileAssets").innerHTML =
    `<h3>Bens declarados</h3><p class="asset-total">${money(c.bensDeclarados)}</p><p class="chart-note">${c.quantidadeBens == null ? "Sem bens registrados neste arquivo; não inferimos patrimônio zero." : fmt(c.quantidadeBens) + " itens declarados. Total declarado, não renda ou auditoria patrimonial."} Fonte: TSE · ${esc(meta.geracaoComplementar?.bens)}</p>${(c.tiposBens || []).map((b) => `<div class="city-row"><span>${esc(b.tipo)}</span><strong>${money(b.valor)}</strong></div>`).join("")}`;
  $("profileNetworks").innerHTML =
    `<h3>Redes e endereços declarados</h3>${(c.redesDeclaradas || []).length ? "<ul>" + c.redesDeclaradas.map((r) => `<li>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(r.declarado)}</a>` : esc(r.declarado)}</li>`).join("") : '<p class="muted">Sem endereço declarado neste arquivo.</p>'}<p class="chart-note">Informações declaradas ao TSE em ${esc(meta.geracaoComplementar?.redes)}. Handles sem endereço completo são exibidos como texto. Não verificamos atividade das contas.</p>`;
  renderProfileCities();
}
$("profileCitiesMore").addEventListener("click", () => {
  profileLimit += 20;
  renderProfileCities();
});
$("profileCitySearch").addEventListener("input", () => {
  profileLimit = 20;
  renderProfileCities();
});
$("favoriteProfile").addEventListener("click", () => {
  if (currentProfile) toggleFavorite(currentProfile.id);
});

let mobileWidth = window.matchMedia("(max-width:760px)").matches;
window.addEventListener("resize", () => {
  const next = window.matchMedia("(max-width:760px)").matches;
  if (next !== mobileWidth && candidates.length) {
    mobileWidth = next;
    render();
  }
});
load();

function renderAnalysis() {
  if (!model) return;
  const scope = currentScope();
  $("analysisScope").textContent =
    `${scope.label} · ${scope.cityCount} ${scope.cityCount === 1 ? "município" : "municípios"}`;
  const groups = new Map();
  for (const c of candidates) {
    const value =
      chartMode === "seats" ? (c.eleito ? 1 : 0) : scope.votes(c) || 0;
    groups.set(c.partido, (groups.get(c.partido) || 0) + value);
  }
  const entries = [...groups]
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n > 0),
    max = entries[0]?.[1] || 1;
  $("parties").innerHTML = entries
    .map(
      ([party, value]) =>
        `<div class="bar-row"><button data-party="${esc(party)}">${esc(party)}</button><div class="track"><i style="width:${(100 * value) / max}%"></i></div><span>${fmt(value)}</span></div>`,
    )
    .join("");
  $("partyChartNote").textContent =
    chartMode === "seats"
      ? "41 cadeiras estaduais. Clique em um partido para consultar seus perfis."
      : "Soma dos votos nominais por partido no recorte. Não inclui votos de legenda.";
  $("rankingTitle").textContent = "Ranking completo · " + scope.label;
  $("ranking").innerHTML = scope.ordered
    .filter((c) => scope.votes(c) != null)
    .map(
      (c, i) =>
        `<li><span>${i + 1}</span><button data-profile="${c.id}">${esc(c.nome)}<small>${esc(c.partido)} · ${esc(c.situacao)}</small></button><strong>${fmt(scope.votes(c))}</strong></li>`,
    )
    .join("");
  const electedVotes = candidates
    .filter((c) => c.eleito)
    .reduce((sum, c) => sum + (scope.votes(c) || 0), 0);
  $("voteSummary").textContent =
    `${fmt(scope.total)} votos nominais em ${scope.label}. ${fmt(electedVotes)} (${pct(electedVotes, scope.total)}) foram destinados a candidaturas eleitas no estado. Não inclui legenda.`;
  renderRegionalOverview();
  document
    .querySelectorAll("[data-chart]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.chart === chartMode),
    );
}
document.querySelectorAll("[data-chart]").forEach((button) =>
  button.addEventListener("click", () => {
    chartMode = button.dataset.chart;
    renderAnalysis();
  }),
);

if (location.hash === "#baixar") location.hash = "aplicativo";

function territoryType(scope) {
  return scope.municipality
    ? "Município"
    : scope.region
      ? `Região ${scope.region.type === "imediata" ? "imediata" : "intermediária"}`
      : "Estado";
}
function renderScopeReading(scope) {
  const positive = scope.ordered.filter((c) => (scope.votes(c) || 0) > 0),
    leader = positive[0];
  $("scopeReadingTitle").textContent = "Leitura objetiva · " + scope.label;
  $("scopeReading").innerHTML = leader
    ? `<p>${territoryType(scope)} · <strong>${fmt(scope.total)} votos nominais</strong> · ${scope.cityCount} ${scope.cityCount === 1 ? "município" : "municípios"} · ${positive.length} candidaturas com votos.</p><p><strong>${esc(leader.nome)}</strong> lidera a votação nominal: ${fmt(scope.votes(leader))} votos, <strong>${pct(scope.votes(leader), scope.total)}</strong> do total do território.</p>`
    : "<p>Nenhum voto nominal registrado no território. Não há liderança ou percentual a calcular.</p>";
}
function comparisonFields(c) {
  const t = model.territory(c);
  return [
    ["Resultado estadual", c.situacao],
    ["Votos em " + currentScope().label, fmt(votesFor(c))],
    ["% nominal do território", percentage(c)],
    ["Votos estaduais", fmt(c.votos)],
    [
      "Cidade com mais votos",
      t.topCity?.municipality.nomeIbge || "Não disponível",
    ],
    ["Região com mais votos", t.topRegion?.region.nome || "Não disponível"],
    [
      "Votos nas três maiores cidades",
      c.votos > 0 ? pct(t.topThreeVotes, c.votos) : "Não disponível",
    ],
    [
      "Municípios com votos",
      c.votos == null ? "Não disponível" : fmt(t.cityCount),
    ],
    ["UF de nascimento", c.ufNascimento || "Não informada"],
  ];
}
function renderProfileTerritory() {
  const c = currentProfile,
    t = model.territory(c),
    scope = currentScope();
  let items;
  if (c.votos == null)
    items = [
      "Sem registro de votação nesta base. Distribuição territorial indisponível.",
    ];
  else if (c.votos === 0)
    items = [
      "Zero votos nominais registrados. Sem município ou região de maior votação.",
    ];
  else {
    items = [
      `${fmt(c.votos)} votos estaduais em ${t.cityCount} de ${municipalities.length} municípios.`,
      `${t.topCity.municipality.nomeIbge}: ${fmt(t.topCity.votos)} votos — ${pct(t.topCity.votos, c.votos)} dos votos da candidatura.`,
      `As três cidades de maior votação concentram ${pct(t.topThreeVotes, c.votos)} dos votos da candidatura.`,
    ];
    if (scope.municipality || scope.region)
      items.push(
        `No recorte ${scope.label}: ${fmt(scope.votes(c))} votos — ${pct(scope.votes(c), scope.total)} do total nominal do território.`,
      );
  }
  $("profileReading").innerHTML = items
    .map((text) => `<li>${esc(text)}</li>`)
    .join("");
  const facts = [
    [
      "Município de maior votação",
      t.topCity?.municipality.nomeIbge || "Não disponível",
    ],
    [
      "Região intermediária de maior votação",
      t.topRegion?.region.nome || "Não disponível",
    ],
    ["UF de nascimento", c.ufNascimento || "Não informada"],
    ["Município de residência", "Não consta no cadastro usado"],
  ];
  $("profileTerritoryFacts").innerHTML = facts
    .map(
      ([label, value]) =>
        `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`,
    )
    .join("");
  $("profileRegions").innerHTML =
    c.votos == null
      ? '<p class="muted">Distribuição regional indisponível.</p>'
      : t.regions
          .map(
            (r) =>
              `<div class="city-row territorial-row"><button data-region="${r.region.key}" aria-label="Consultar região intermediária de ${esc(r.region.nome)}">${esc(r.region.nome)}</button><div><strong>${fmt(r.votos)} votos</strong><small>${pct(r.votos, c.votos)} dos votos da candidatura</small></div></div>`,
          )
          .join("");
}
function chooseTerritory(region = "", city = "") {
  if (!model) return;
  if ($("profile").open) $("profile").close();
  view = "all";
  page = 1;
  [
    "search",
    "partyFilter",
    "statusFilter",
    "municipalitySearch",
    "ageFilter",
    "dataFilter",
    "minVotes",
    "maxVotes",
  ].forEach((id) => ($(id).value = ""));
  $("favoritesOnly").checked = false;
  $("withVotesOnly").checked = true;
  $("sort").value = "votes";
  $("regionFilter").value = region;
  $("territoryPanel").open = true;
  renderMunicipalityOptions();
  $("municipalityFilter").value = city;
  render();
  $("consulta").scrollIntoView({ behavior: "auto" });
}
function renderRegionalOverview() {
  $("regionOverview").innerHTML = [...model.regions.values()]
    .filter((r) => r.type === "intermediaria")
    .sort((a, b) => b.total - a.total)
    .map((r) => {
      const s = model.scope("", r.key),
        leader = s.ordered.find((c) => (s.votes(c) || 0) > 0);
      return `<article class="region-row"><div><button data-region="${r.key}">${esc(r.nome)}</button><small>${r.indices.length} municípios · ${fmt(r.total)} votos nominais</small></div><div><span>Maior votação nominal</span><strong>${esc(leader?.nome || "Sem votos")}</strong><small>${leader ? fmt(s.votes(leader)) + " votos · " + pct(s.votes(leader), r.total) : "Sem base percentual"}</small></div></article>`;
    })
    .join("");
}

function territoryLabel(c) {
  const top = model.territory(c).topCity;
  if (!top)
    return c.votos == null
      ? "Distribuição territorial indisponível"
      : "Sem votos nominais registrados";
  return `Maior votação: ${esc(top.municipality.nomeIbge)} · região imediata de ${esc(top.municipality.regiaoImediata.nome)}`;
}

function renderActiveFilters() {
  const items = [];
  if ($("search").value.trim())
    items.push(["search", "Busca: " + $("search").value.trim()]);
  if (view !== "all")
    items.push([
      "view",
      view === "elected" ? "Eleitos" : "Não eleitos e suplentes",
    ]);
  for (const [id, label] of [
    ["regionFilter", "Região"],
    ["municipalityFilter", "Município"],
    ["partyFilter", "Partido"],
    ["statusFilter", "Situação"],
    ["ageFilter", "Idade"],
    ["dataFilter", "Dados"],
  ])
    if ($(id).value)
      items.push([id, label + ": " + $(id).selectedOptions[0].textContent]);
  if ($("minVotes").value)
    items.push(["minVotes", "Mínimo: " + $("minVotes").value + " votos"]);
  if ($("maxVotes").value)
    items.push(["maxVotes", "Máximo: " + $("maxVotes").value + " votos"]);
  if ($("favoritesOnly").checked) items.push(["favoritesOnly", "Favoritos"]);
  if ($("withVotesOnly").checked) items.push(["withVotesOnly", "Com votos"]);
  $("activeFilters").innerHTML = items
    .map(
      ([key, label]) =>
        `<button data-clear-filter="${key}" aria-label="Remover filtro ${esc(label)}">${esc(label)}${icon("close")}</button>`,
    )
    .join("");
  $("activeFilters").hidden = items.length === 0;
  $("filterCount").textContent = `${items.length} ${items.length === 1 ? "filtro ativo" : "filtros ativos"}`;
}
function clearFilter(id) {
  page = 1;
  if (id === "view") {
    view = "all";
    $("statusFilter").value = "";
  } else if (["favoritesOnly", "withVotesOnly"].includes(id))
    $(id).checked = false;
  else $(id).value = "";
  if (id === "regionFilter" || id === "municipalityFilter") {
    $("municipalitySearch").value = "";
    renderMunicipalityOptions();
  }
  render();
  $("search").focus({ preventScroll: true });
}
function clearComparison() {
  selected.clear();
  render();
  $("search").focus({ preventScroll: true });
}
$("clearComparison").addEventListener("click", clearComparison);
$("clearCompareTray").addEventListener("click", clearComparison);
function renderProfileNavigation() {
  const list = filtered(),
    index = list.findIndex((c) => c.id === currentProfile?.id);
  $("previousProfile").disabled = index <= 0;
  $("nextProfile").disabled = index < 0 || index >= list.length - 1;
  $("profilePosition").textContent =
    index < 0 ? "Fora da lista atual" : `${index + 1} de ${list.length}`;
}
function moveProfile(step) {
  const list = filtered(),
    index = list.findIndex((c) => c.id === currentProfile?.id),
    next = list[index + step];
  if (index >= 0 && next) profile(next.id);
}
$("previousProfile").addEventListener("click", () => moveProfile(-1));
$("nextProfile").addEventListener("click", () => moveProfile(1));
$("shareProfile").addEventListener("click", async () => {
  if (!currentProfile) return;
  const url = new URL(
    "https://pabloguilherme1121.github.io/eleicoes-goias-2026/",
  );
  url.searchParams.set("perfil", currentProfile.id);
  url.hash = "consulta";
  if (navigator.share) {
    try {
      await navigator.share({
        title: currentProfile.nome + " · Goiás 2026",
        url: url.href,
      });
      $("profileShareStatus").textContent =
        "Perfil entregue ao compartilhamento.";
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        $("profileShareStatus").textContent = "Compartilhamento cancelado.";
        return;
      }
    }
  }
  try {
    await navigator.clipboard.writeText(url.href);
    $("profileShareStatus").textContent = "Link do perfil copiado.";
  } catch {
    $("profileShareFallback").hidden = false;
    $("profileShareLink").value = url.href;
    $("profileShareLink").focus();
    $("profileShareLink").select();
    $("profileShareStatus").textContent =
      "Copie o link selecionado para compartilhar o perfil.";
  }
});
window.addEventListener("popstate", () => {
  if (!model) return;
  restoringLocation = true;
  if ($("profile").open) $("profile").close();
  view = "all";
  page = 1;
  [
    "search",
    "partyFilter",
    "statusFilter",
    "regionFilter",
    "municipalityFilter",
    "municipalitySearch",
    "ageFilter",
    "dataFilter",
    "minVotes",
    "maxVotes",
  ].forEach((id) => ($(id).value = ""));
  $("sort").value = "votes";
  const id = new URLSearchParams(location.search).get("perfil");
  restoreFilters();
  render();
  if (id) profile(id, false);
  restoringLocation = false;
});
let printState = null;
window.addEventListener("beforeprint", () => {
  if (!$("profile").open) return;
  printState = {
    limit: profileLimit,
    query: $("profileCitySearch").value,
    details: [...$("profile").querySelectorAll("details")].map((d) => d.open),
  };
  profileLimit = Infinity;
  $("profileCitySearch").value = "";
  $("profile")
    .querySelectorAll("details")
    .forEach((d) => (d.open = true));
  renderProfileCities();
});
window.addEventListener("afterprint", () => {
  if (!printState) return;
  profileLimit = printState.limit;
  $("profileCitySearch").value = printState.query;
  [...$("profile").querySelectorAll("details")].forEach(
    (d, i) => (d.open = printState.details[i]),
  );
  renderProfileCities();
  printState = null;
});

function refreshSavedCity() {
  const city = municipalities.find(
    (m) => String(m.codigoIbge) === savedCityCode,
  );
  $("saveCity").hidden =
    !currentCity() ||
    (String(currentCity().codigoIbge) === savedCityCode && cityIsPersistent);
  $("saveCity").disabled =
    !currentCity() ||
    (String(currentCity().codigoIbge) === savedCityCode && cityIsPersistent);
  $("cityShortcuts").hidden =
    !currentCity() && !city && !$("cityStatus").textContent;
  $("restoreCity").hidden = !city;
  $("forgetCity").hidden = !city;
  if (city)
    $("restoreCity").textContent =
      `${cityIsPersistent ? "Minha cidade" : "Cidade nesta sessão"}: ${city.nomeIbge}`;
}
$("saveCity").addEventListener("click", () => {
  const city = currentCity();
  if (!city) return;
  savedCityCode = String(city.codigoIbge);
  try {
    localStorage.setItem("goias-city", savedCityCode);
    cityIsPersistent = true;
    $("cityStatus").textContent =
      "Cidade salva neste navegador. Use Minha cidade para voltar ao recorte.";
  } catch {
    cityIsPersistent = false;
    $("cityStatus").textContent =
      "Cidade guardada apenas nesta sessão; o navegador bloqueou o armazenamento.";
  }
  refreshSavedCity();
});
$("restoreCity").addEventListener("click", () => {
  const index = municipalities.findIndex(
    (m) => String(m.codigoIbge) === savedCityCode,
  );
  if (index < 0) return;
  chooseTerritory("", String(index));
  $("cityStatus").textContent =
    "Consulta aberta na cidade escolhida. A situação eleitoral permanece estadual.";
});
$("forgetCity").addEventListener("click", () => {
  try {
    localStorage.removeItem("goias-city");
    savedCityCode = "";
    cityIsPersistent = true;
    $("cityStatus").textContent =
      "Cidade removida das preferências. O recorte atual foi mantido.";
    refreshSavedCity();
  } catch {
    $("cityStatus").textContent =
      "Não foi possível remover a preferência. Você ainda pode mudar o recorte.";
  }
});
$("shareComparison").addEventListener("click", async () => {
  if (!selected.size) return;
  const url = new URL(
    "https://pabloguilherme1121.github.io/eleicoes-goias-2026/",
  );
  for (const [key, value] of Object.entries(queryValues()))
    if (value && key !== "perfil" && key !== "favoritos")
      url.searchParams.set(key, value);
  url.hash = "compare";
  try {
    await navigator.clipboard.writeText(url.href);
    $("comparisonStatus").textContent =
      "Link copiado com os perfis e o recorte territorial.";
    $("comparisonFallback").hidden = true;
  } catch {
    $("comparisonFallback").hidden = false;
    $("comparisonLink").value = url.href;
    $("comparisonLink").focus();
    $("comparisonLink").select();
    $("comparisonStatus").textContent =
      "Copie o link selecionado para compartilhar a comparação.";
  }
});

function candidateBio(c) {
  const parts = [];
  if (c.idade != null) parts.push(c.idade + " anos");
  if (c.ocupacao) parts.push(displayName(c.ocupacao));
  return parts.length
    ? esc(parts.join(" · "))
    : "Idade e ocupação não informadas";
}
function validateVoteRange() {
  const min = $("minVotes"),
    max = $("maxVotes");
  const bad = !min.validity.valid || !max.validity.valid,
    swapped =
      min.value !== "" &&
      max.value !== "" &&
      Number(min.value) > Number(max.value);
  $("filterError").hidden = !bad && !swapped;
  $("filterError").textContent = bad
    ? "Use números inteiros maiores ou iguais a zero."
    : swapped
      ? "O mínimo supera o máximo. Ajuste o intervalo para obter resultados."
      : "";
}
