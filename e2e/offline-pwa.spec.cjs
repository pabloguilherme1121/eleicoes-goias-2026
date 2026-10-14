"use strict";
const { test, expect } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

// O WebKit do Playwright apresenta erro interno ao usar context.setOffline(true)
// com páginas controladas por Service Worker. Para testar o cache de navegação,
// iniciamos uma origem exclusiva e a desligamos depois do precache.
async function startDisposableOrigin() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const relative = pathname === "/" ? "index.html" : pathname.slice(1);
      const filename = path.resolve(root, relative);
      if (!filename.startsWith(root + path.sep))
        throw new Error("Path outside app");
      const bytes = await fs.readFile(filename);
      response.writeHead(200, {
        "Content-Type": mime[path.extname(filename)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let closed = false;
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    async stop() {
      if (closed) return;
      closed = true;
      const closing = new Promise((resolve) => server.close(resolve));
      server.closeAllConnections();
      await closing;
    },
  };
}

test("PWA mantém candidatura, perfil e dados eleitorais após perder conexão", async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(90_000);
  const isolated = browserName === "webkit"
    ? await startDisposableOrigin()
    : null;
  const target = (suffix) => isolated ? isolated.origin + suffix : suffix;

  try {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(target("/"));
    await expect(page.locator("#content")).toBeVisible();
    await expect(page.locator("#candidateCards .candidate-card")).toHaveCount(595);

    // Confirmar controlador ativo e TODOS os recursos essenciais em cache.
    await expect.poll(
      () => page.evaluate(async () => {
        if (!navigator.serviceWorker?.controller) return false;
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.active) return false;
        const channel = new MessageChannel();
        return await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000);
          channel.port1.onmessage = ({ data }) => {
            clearTimeout(timeout);
            channel.port1.close();
            resolve(data?.ok === true && data.files === data.expected);
          };
          registration.active.postMessage({ type: "OFFLINE_STATUS" }, [channel.port2]);
        });
      }),
      { timeout: 20_000 },
    ).toBe(true);

    if (isolated) await isolated.stop(); // WebKit: indisponibilidade real da origem.
    else await context.setOffline(true); // Chromium/Firefox: emulação de rede offline.

    const response = await page.goto(target("/?q=CAROL%20AMILTINHO#consulta"));
    expect(response?.fromServiceWorker()).toBe(true);
    await expect(page.locator("#content")).toBeVisible();
    await expect(page.locator("#candidateCards .candidate-card")).toHaveCount(1);
    await expect(page.locator("#ranking li")).toHaveCount(556);
    await page.locator("#candidateCards [data-profile]").first().click();
    await expect(page.locator("#profile")).toBeVisible();
    await expect(page.locator("#profileName")).toContainText(/Carol/i);

    const restored = await page.reload();
    expect(restored?.fromServiceWorker()).toBe(true);
    await expect(page.locator("#profile")).toBeVisible();
    await expect(page.locator("#profileName")).toContainText(/Carol/i);
  } finally {
    if (isolated) await isolated.stop();
    else await context.setOffline(false);
  }
});
