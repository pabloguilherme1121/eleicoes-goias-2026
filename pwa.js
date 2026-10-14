"use strict";
(() => {
  const install = document.getElementById("installPwa"),
    status = document.getElementById("pwaStatus"),
    update = document.getElementById("updatePwa"),
    details = document.getElementById("pwaDetails"),
    check = document.getElementById("checkPwaUpdate"),
    repair = document.getElementById("repairPwa");
  if (!install || !status || !update) return;
  let prompt = null,
    registration = null,
    ready = false,
    installed = false,
    installing = false;
  const standalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  function renderInstall() {
    install.hidden = installed;
    install.disabled = installing;
    install.textContent = installing
      ? "Aguardando navegador…"
      : prompt
        ? "Instalar aplicativo"
        : "Ver como instalar";
  }
  installed = standalone();
  renderInstall();
  function connection() {
    if (standalone()) install.hidden = true;
    status.textContent = "Verificando arquivos para consulta offline…";
  }
  connection();
  if (
    location.protocol === "file:" ||
    document.getElementById("embeddedData")
  ) {
    status.textContent =
      "Este HTML já inclui os dados offline. Para instalar o aplicativo, abra o site publicado.";
    install.hidden = true;
    check.hidden = true;
    repair.hidden = true;
    return;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    if (installed) return;
    prompt = event;
    renderInstall();
  });
  install.addEventListener("click", async () => {
    if (!prompt) {
      document.getElementById("installGuide").showModal();
      return;
    }
    const current = prompt;
    prompt = null;
    installing = true;
    renderInstall();
    try {
      await current.prompt();
      const choice = await current.userChoice;
      status.textContent =
        choice.outcome === "accepted"
          ? "Instalação solicitada ao navegador. Se aparecer falha ao abrir, consulte Ajuda para instalar."
          : "Instalação cancelada. Você pode continuar pelo navegador.";
      if (installed)
        status.textContent = "Instalação confirmada pelo navegador.";
    } catch {
      status.textContent =
        "O navegador não concluiu a instalação. Abra Ver como instalar ou Recuperar aplicativo.";
    } finally {
      installing = false;
      renderInstall();
    }
  });
  window.addEventListener("appinstalled", () => {
    prompt = null;
    installed = true;
    renderInstall();
    status.textContent =
      "Instalação confirmada pelo navegador. Teste o ícone na tela inicial; se falhar ao abrir, use Recuperar aplicativo.";
  });
  const onlineStatus = () => {
    if (document.documentElement.dataset.recovery) {
      status.textContent =
        "Consulta de recuperação online. Abra o site principal após a atualização para usar o modo offline.";
      return;
    }
    status.textContent = ready
      ? navigator.onLine
        ? "Consulta offline pronta neste aparelho."
        : "Sem conexão. Consultando os dados salvos neste aparelho."
      : "O modo offline ainda não foi preparado. Conecte-se e recarregue para tentar novamente.";
  };
  window.addEventListener("online", () => {
    onlineStatus();
    registration?.update().catch(() => {});
  });
  window.addEventListener("offline", onlineStatus);
  if (!("serviceWorker" in navigator)) {
    status.textContent =
      "Este navegador não oferece consulta offline como aplicativo. A consulta online continua disponível.";
    return;
  }
  function ask(worker, type) {
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error("Sem aplicativo ativo"));
        return;
      }
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("Verificação demorou demais"));
      }, 8000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      worker.postMessage({ type }, [channel.port2]);
    });
  }
  const markReady = async (type = "OFFLINE_STATUS") => {
    try {
      const reg = registration || (await navigator.serviceWorker.ready);
      const result = await ask(
        reg.active || navigator.serviceWorker.controller,
        type,
      );
      ready = result.ok === true;
      onlineStatus();
      if (ready && result.repairFailed)
        status.textContent =
          "Consulta offline preservada. Não foi possível concluir o reparo; verifique a conexão ou atualize o aplicativo.";
      details.textContent = ready
        ? `${result.files}/${result.expected} arquivos verificados · ${(result.bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MB salvos neste aparelho`
        : "Arquivos offline incompletos. Conecte-se e use Verificar arquivos offline para reparar.";
      return result;
    } catch {
      ((ready = false), (installed = false), (installing = false));
      status.textContent =
        "Não foi possível confirmar os arquivos offline. Conecte-se e tente verificar novamente.";
    }
  };
  navigator.serviceWorker
    .register("service-worker.js", { scope: "./", updateViaCache: "none" })
    .then((reg) => {
      registration = reg;
      if (reg.waiting) update.hidden = false;
      if (reg.active) markReady();
      const watched = new WeakSet();
      function watch(worker) {
        if (!worker || watched.has(worker)) return;
        watched.add(worker);
        const changed = () => {
          if (worker.state === "installed") {
            if (navigator.serviceWorker.controller) update.hidden = false;
            else markReady();
          }
          if (worker.state === "redundant" && !ready)
            status.textContent =
              "Não foi possível preparar o modo offline. Verifique a conexão e tente novamente.";
        };
        worker.addEventListener("statechange", changed);
        changed();
      }
      watch(reg.installing);
      reg.addEventListener("updatefound", () => watch(reg.installing));
      navigator.serviceWorker.ready.then(() => markReady());
    })
    .catch(() => {
      status.textContent =
        "Modo offline indisponível neste navegador. Continue consultando pelo navegador.";
    });
  update.addEventListener("click", () => {
    if (registration?.waiting) {
      update.disabled = true;
      registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    }
  });
  let controlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (controlled) location.reload();
    controlled = true;
  });
  check.addEventListener("click", async () => {
    if (!registration) {
      status.textContent =
        "Recarregue a página com conexão para iniciar o aplicativo.";
      return;
    }
    check.disabled = true;
    status.textContent = "Verificando atualizações…";
    try {
      await registration.update();
      if (registration.waiting) {
        update.hidden = false;
        status.textContent =
          "Há uma versão nova. Toque em Aplicar atualização para aplicá-la.";
      } else {
        await markReady();
      }
    } catch {
      status.textContent =
        "Não foi possível consultar atualizações. Tente quando tiver conexão.";
    } finally {
      check.disabled = false;
    }
  });
  repair.addEventListener("click", async () => {
    repair.disabled = true;
    status.textContent = "Verificando e reparando arquivos offline…";
    try {
      await markReady("OFFLINE_STATUS");
      if (!ready && navigator.onLine) await markReady("REPAIR_CACHE");
    } finally {
      repair.disabled = false;
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible")
      registration?.update().catch(() => {});
  });
})();

document
  .getElementById("installHelp")
  .addEventListener("click", () =>
    document.getElementById("installGuide").showModal(),
  );
document
  .getElementById("closeInstallGuide")
  .addEventListener("click", () =>
    document.getElementById("installGuide").close(),
  );
