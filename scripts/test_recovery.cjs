"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, ".."),
  version = JSON.parse(fs.readFileSync(root + "/versao.json", "utf8")).version;
const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
function installPage() {
  const dom = new JSDOM(fs.readFileSync(root + "/index.html", "utf8"), {
    url: "https://example.test/eleicoes-goias-2026/",
    runScripts: "outside-only",
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false });
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.eval(fs.readFileSync(root + "/pwa.js", "utf8"));
  return dom;
}
function promptEvent(w, fn, outcome = "accepted") {
  const event = new w.Event("beforeinstallprompt", { cancelable: true });
  event.prompt = fn;
  event.userChoice = Promise.resolve({ outcome });
  w.dispatchEvent(event);
  return event;
}
function recoverPage({
  failure = false,
  waiting = false,
  wrongVersion = false,
  partial = false,
} = {}) {
  const dom = new JSDOM(fs.readFileSync(root + "/recuperar.html", "utf8"), {
      url: "https://example.test/eleicoes-goias-2026/recuperar.html",
      runScripts: "outside-only",
    }),
    w = dom.window;
  w.localStorage.setItem("goias-favorites", '["90002554683"]');
  const messages = [];
  w.MessageChannel = class {
    constructor() {
      this.port1 = { onmessage: null, close() {} };
      this.port2 = { target: this.port1 };
    }
  };
  const reg = {
    scope: "https://example.test/eleicoes-goias-2026/",
    installing: null,
    waiting: null,
    active: null,
    updates: 0,
    async update() {
      this.updates++;
    },
  };
  const active = {
    postMessage(message, ports) {
      messages.push(message.type);
      ports[0].target.onmessage({
        data: {
          ok: !partial || message.type === "REPAIR_CACHE",
          version:
            "goias-eleitoral-" + (wrongVersion ? "0000000000000000" : version),
        },
      });
    },
  };
  reg.active = active;
  if (waiting) {
    const worker = new w.EventTarget();
    worker.state = "installed";
    worker.postMessage = (message) => {
      assert.equal(message.type, "ACTIVATE_UPDATE");
      worker.state = "activated";
      reg.waiting = null;
      reg.active = active;
      worker.dispatchEvent(new w.Event("statechange"));
    };
    reg.waiting = worker;
  }
  Object.defineProperty(w.navigator, "serviceWorker", {
    value: {
      async register(url, options) {
        assert.equal(
          String(url),
          "https://example.test/eleicoes-goias-2026/service-worker.js",
        );
        assert.equal(options.updateViaCache, "none");
        return reg;
      },
    },
  });
  w.fetch = async (url, options) => {
    assert.equal(options.cache, "no-store");
    if (failure) throw new Error("offline");
    return { ok: true, json: async () => ({ version }) };
  };
  w.eval(w.document.querySelector("script").textContent);
  return { dom, w, reg, messages };
}
(async () => {
  let dom = installPage(),
    w = dom.window,
    d = w.document;
  assert.match(d.getElementById("installPwa").textContent, /Ver como instalar/);
  d.getElementById("installPwa").click();
  assert(d.getElementById("installGuide").open);
  promptEvent(w, async () => {
    throw new Error("Native prompt failed");
  });
  d.getElementById("installPwa").click();
  await tick();
  assert.equal(d.getElementById("installPwa").hidden, false);
  assert.equal(d.getElementById("installPwa").disabled, false);
  assert.match(d.getElementById("pwaStatus").textContent, /não concluiu/);
  promptEvent(w, async () => {}, "dismissed");
  d.getElementById("installPwa").click();
  await tick();
  assert.match(d.getElementById("pwaStatus").textContent, /cancelada/);
  assert.equal(d.getElementById("installPwa").hidden, false);
  promptEvent(w, async () => {
    w.dispatchEvent(new w.Event("appinstalled"));
  });
  d.getElementById("installPwa").click();
  await tick();
  assert.equal(d.getElementById("installPwa").hidden, true);
  assert.match(d.getElementById("pwaStatus").textContent, /confirmada/);
  dom.window.close();
  for (const options of [
    {},
    { waiting: true },
    { partial: true },
    { wrongVersion: true },
    { failure: true },
  ]) {
    const t = recoverPage(options);
    t.w.document.getElementById("recover").click();
    await tick();
    assert.equal(t.w.document.getElementById("recover").disabled, false);
    assert.equal(
      t.w.localStorage.getItem("goias-favorites"),
      '["90002554683"]',
    );
    const failed = options.wrongVersion || options.failure;
    assert.equal(
      t.w.document.getElementById("openUpdated").hidden,
      Boolean(failed),
    );
    if (options.partial) assert(t.messages.includes("REPAIR_CACHE"));
    if (failed)
      assert.match(
        t.w.document.getElementById("status").textContent,
        /Não foi possível confirmar/,
      );
    t.dom.window.close();
  }
  const fresh = fs.readFileSync(root + "/consulta.html", "utf8");
  assert(fresh.includes('data-recovery="true"'));
  for (const name of [
    "app.js",
    "model.js",
    "styles.css",
    "pwa.js",
    "manifest.webmanifest",
  ])
    assert(fresh.includes(name + "?v=" + version));
  assert(fresh.includes("Consulta de recuperação online"));
  assert.equal((fresh.match(/data-release="([^"]+)"/) || [])[1], version);
  console.log(
    "PASS: erro/cancelamento/confirmação de instalação; atualização e reparo verificados; falha de rede/versão; favoritos preservados; rota online versionada.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
