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
  assert.match(d.getElementById("compareTrayCount").textContent, /3\/3/);
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
  dom.window.close();
  console.log(
    "PASS: links de perfil, navegação, histórico, filtros, limite de comparação, impressão completa e ausência de exportações.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
