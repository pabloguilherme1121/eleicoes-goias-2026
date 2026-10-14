"use strict";
const { test, expect } = require("@playwright/test");

for (const width of [320, 390]) {
  test(`consulta e perfil no celular de ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/");
    await expect(page.locator("#content")).toBeVisible();
    await expect(page.locator("#candidateCards .candidate-card")).toHaveCount(595);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      ),
    ).toBe(false);

    await expect(page.locator("#ranking li")).toHaveCount(556);
    await expect(page.locator("#ranking li")).toHaveCount(556);
  await page.locator("#search").fill("CAROL AMILTINHO");
    await expect(page.locator("#candidateCards .candidate-card")).toHaveCount(1);
    await expect(page.locator("#filterCount")).toHaveText("1 filtro ativo");
    await page.locator("#candidateCards [data-profile]").first().click();
    await expect(page.locator("#profile")).toBeVisible();
    await expect(page.locator("#profileLegalNotice")).toContainText(
      "PENDENTE DE JULGAMENTO",
    );
    await page.locator("#closeProfile").click();
    await expect(page.locator("#profile")).not.toBeVisible();
  });
}

test("consulta e filtros no desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.locator("#tbody tr")).toHaveCount(595);
  await page.locator("#search").fill("CAROL AMILTINHO");
  await expect(page.locator("#tbody tr")).toHaveCount(1);
  await expect(page.locator("#tbody tr").first()).toContainText(/Carol/i);
  await expect(page.locator("#filterCount")).toHaveText("1 filtro ativo");
});
