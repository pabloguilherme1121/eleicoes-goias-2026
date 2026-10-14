"use strict";
const { test, expect } = require("@playwright/test");

// Um cache simulado em Node não prova que uma navegação real usa o service worker.
test("PWA mantém candidatura, perfil e dados eleitorais após perder conexão", async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/");
  await expect(page.locator("#content")).toBeVisible();
  await expect(page.locator("#candidateCards .candidate-card")).toHaveCount(595);

  // A ativação do worker e a integridade do cache devem terminar antes do offline.
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
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
            registration.active.postMessage(
              { type: "OFFLINE_STATUS" },
              [channel.port2],
            );
          });
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  // Limitação do emulador WebKit: setOffline(true) falha na navegação
  // controlada por service worker antes de entregar a resposta do cache.
  // Para WebKit, abortamos apenas requisições de rede e comprovamos que a
  // navegação foi respondida pelo service worker (não equivale a WebAPK físico).
  const webkitNetworkFailure = browserName === "webkit";
  if (webkitNetworkFailure)
    await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else
    await context.setOffline(true);

  try {
    // O caminho indexado no GitHub Pages é a mesma navegação de origem com query.
    const navigation = await page.goto("/?q=CAROL%20AMILTINHO#consulta");
    expect(navigation?.fromServiceWorker()).toBe(true);
    await expect(page.locator("#content")).toBeVisible();
    await expect(page.locator("#candidateCards .candidate-card")).toHaveCount(1);
    await expect(page.locator("#ranking li")).toHaveCount(556);

    await page.locator("#candidateCards [data-profile]").first().click();
    await expect(page.locator("#profile")).toBeVisible();
    await expect(page.locator("#profileName")).toContainText(/Carol/i);
    await page.reload();
    await expect(page.locator("#profile")).toBeVisible();
    await expect(page.locator("#profileName")).toContainText(/Carol/i);
  } finally {
    if (webkitNetworkFailure) await context.unroute("**/*");
    else await context.setOffline(false);
  }
});
