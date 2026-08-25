import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";

test("room peers derive the same live prompt", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: "mesh-five-second-rule",
  });

  try {
    await expect(a.locator(".round-card h2")).toBeVisible();
    await expect(b.locator(".round-card h2")).toBeVisible();
    await expect(a.locator(".round-card h2")).toHaveText(
      await b.locator(".round-card h2").innerText(),
    );
    await expect(a.getByText(/player.*in this room/i)).toBeVisible();
    await expect(b.getByText(/player.*in this room/i)).toBeVisible();
  } finally {
    await cleanup();
  }
});

test("mobile entry keeps the real round and an immediate action in view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".rule-launch")).toBeVisible();
  await expect(page.locator(".launch-round-preview")).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Launch actions" }).getByRole("button").first(),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test("short desktop keeps the first play action above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1141, height: 602 });
  await page.goto("./", { waitUntil: "domcontentloaded" });

  const primaryAction = page
    .getByRole("group", { name: "Launch actions" })
    .getByRole("button")
    .first();
  await expect(primaryAction).toBeVisible();
  const box = await primaryAction.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? Number.POSITIVE_INFINITY) + (box?.height ?? 0)).toBeLessThanOrEqual(602);
});
