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
