"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, ".."),
  data = JSON.parse(fs.readFileSync(root + "/data/candidatos.json", "utf8"));
function setup(url) {
  const dom = new JSDOM(fs.readFileSync(root + "/index.html", "utf8"), {
    url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.fetch = async () => ({ ok: true, json: async () => data });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  for (const name of ["model.js", "app.js", "pwa.js"])
    w.eval(fs.readFileSync(root + "/" + name, "utf8"));
  return dom;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 50));
(async () => {
  const dom = setup("https://example.test/?perfil=90002554683"),
    w = dom.window,
    d = w.document;
  await tick();
  assert.equal(d.getElementById("content").hidden, false);
  assert.equal(
    d.querySelectorAll("#candidateCards .candidate-card").length,
    50,
  );
  assert.equal(d.querySelectorAll("#ranking li").length, 50);
  assert.match(d.getElementById("resultCount").textContent, /1–50 de 595/);
  d.getElementById("next").click();
  assert.equal(
    d.querySelectorAll("#candidateCards .candidate-card").length,
    50,
  );
  assert.match(d.getElementById("resultCount").textContent, /51–100 de 595/);
  d.getElementById("prev").click();
  assert.equal(d.getElementById("profile").open, true);
  assert.equal(
    new w.URLSearchParams(w.location.search).get("perfil"),
    "90002554683",
  );
  assert.match(d.getElementById("profileName").textContent, /Carol/);
  assert.equal(d.getElementById("previousProfile").disabled, true);
  const first = d.getElementById("profileName").textContent;
  d.getElementById("nextProfile").click();
  assert.notEqual(d.getElementById("profileName").textContent, first);
  d.getElementById("previousProfile").click();
  assert.equal(d.getElementById("profileName").textContent, first);
  d.getElementById("profileCitySearch").value = "Anápolis";
  d.getElementById("profileCitySearch").dispatchEvent(new w.Event("input"));
  const before = d.getElementById("profileCities").children.length;
  w.dispatchEvent(new w.Event("beforeprint"));
  assert.equal(
    d.getElementById("profileCities").children.length,
    data.candidatos.find((c) => c.id === "90002554683").votacaoMunicipal.length,
  );
  assert(
    [...d.getElementById("profile").querySelectorAll("details")].every(
      (el) => el.open,
    ),
  );
  w.dispatchEvent(new w.Event("afterprint"));
  assert.equal(d.getElementById("profileCitySearch").value, "Anápolis");
  assert.equal(d.getElementById("profileCities").children.length, before);
  d.getElementById("shareProfile").click();
  await tick();
  assert.equal(d.getElementById("profileShareFallback").hidden, false);
  assert.match(
    d.getElementById("profileShareLink").value,
    /perfil=90002554683/,
  );
  d.getElementById("closeProfile").click();
  assert.equal(new w.URLSearchParams(w.location.search).has("perfil"), false);
  const boxes = [...d.querySelectorAll("#candidateCards [data-compare]")];
  for (const box of boxes.slice(0, 4)) {
    box.checked = true;
    box.dispatchEvent(new w.Event("change", { bubbles: true }));
  }
  assert.equal(boxes[3].checked, false);
  assert.equal(d.getElementById("compareTray").hidden, false);
  assert.match(d.getElementById("compareTrayCount").textContent, /Limite de 3/);
  d.getElementById("clearCompareTray").click();
  assert.equal(d.getElementById("compareTray").hidden, true);
  d.getElementById("search").value = "zz-no-match-zz";
  d.getElementById("search").dispatchEvent(new w.Event("input"));
  assert.equal(d.getElementById("mobileEmpty").hidden, false);
  d.querySelector('[data-clear-filter="search"]').click();
  assert.equal(d.getElementById("search").value, "");
  assert.equal(d.getElementById("mobileEmpty").hidden, true);
  d.getElementById("regionFilter").value = "intermediaria:5206";
  d.getElementById("regionFilter").dispatchEvent(new w.Event("change"));
  d.querySelector('[data-clear-filter="regionFilter"]').click();
  assert.equal(d.getElementById("regionFilter").value, "");
  assert.equal(d.getElementById("municipalityFilter").options.length, 247);
  const trigger = d.querySelector("#candidateCards [data-profile]");
  trigger.focus();
  trigger.click();
  w.history.back();
  await tick();
  await tick();
  assert.equal(d.getElementById("profile").open, false);
  w.history.forward();
  await tick();
  await tick();
  assert.equal(d.getElementById("profile").open, true);
  assert(d.body.classList.contains("modal-open"));
  assert.equal(
    d.querySelectorAll("#export,#downloadCsv,[data-remote-file]").length,
    0,
  );

  assert.equal(d.getElementById("compareCards").children.length, 0);
  dom.window.close();
  const ids = data.candidatos.slice(0, 4).map((c) => c.id);
  const linked = setup(
      `https://example.test/?cidade=5200258&comparar=${ids[0]},${ids[0]},invalid,${ids[1]},${ids[2]},${ids[3]}`,
    ),
    lw = linked.window,
    ld = lw.document;
  await tick();
  assert.equal(ld.getElementById("compareCards").children.length, 3);
  assert.match(ld.getElementById("compareCards").textContent, /Águas Lindas/);
  ld.getElementById("shareComparison").click();
  await tick();
  assert.equal(ld.getElementById("comparisonFallback").hidden, false);
  const link = new URL(ld.getElementById("comparisonLink").value);
  assert.equal(link.hash, "#compare");
  assert.equal(link.searchParams.get("comparar"), ids.slice(0, 3).join(","));
  assert.equal(link.searchParams.get("cidade"), "5200258");
  assert(!link.searchParams.has("favoritos"));
  ld.getElementById("saveCity").click();
  assert.equal(lw.localStorage.getItem("goias-city"), "5200258");
  assert.equal(ld.getElementById("restoreCity").hidden, false);
  ld.querySelector('[data-clear-filter="municipalityFilter"]').click();
  assert.equal(ld.getElementById("municipalityFilter").value, "");
  ld.getElementById("restoreCity").click();
  assert.equal(
    ld.getElementById("municipalityFilter").value,
    String(data.municipios.findIndex((m) => m.codigoIbge === 5200258)),
  );
  ld.getElementById("sort").value = "name";
  ld.getElementById("sort").dispatchEvent(new lw.Event("change"));
  assert.match(ld.getElementById("candidatesCaption").textContent, /nome/);
  ld.getElementById("forgetCity").click();
  assert.equal(lw.localStorage.getItem("goias-city"), null);
  assert.equal(ld.getElementById("restoreCity").hidden, true);
  ld.getElementById("clearComparison").click();
  assert(!new URL(lw.location.href).searchParams.has("comparar"));
  lw.Storage.prototype.setItem = function () {
    throw new Error("Storage blocked");
  };
  ld.getElementById("saveCity").click();
  assert.match(
    ld.getElementById("cityStatus").textContent,
    /apenas nesta sessão/,
  );
  linked.window.close();

  console.log(
    "PASS: links de perfil, navegação, histórico, filtros, limite de comparação, impressão completa e ausência de exportações.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
