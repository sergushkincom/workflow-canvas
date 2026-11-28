import { expect, test } from "@playwright/test";

import {
  LINK_COPIED,
  LINK_INVALID,
  LINK_OPEN_TOO_LONG,
  MAX_SHARE_URL_LENGTH,
} from "../lib/experiments/workflow-canvas/canvas-link";

test("copy link restores the canvas and its scroll position", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto("/experiments/workflow-canvas?flow=support-triage");
  await expect(
    page.getByRole("heading", { name: "Support triage" }),
  ).toBeVisible();

  const scroller = page.locator("[data-workflow-canvas]");
  await scroller.evaluate((element) => {
    element.scrollTop = 200;
  });
  const before = await scroller.evaluate((element) => element.scrollTop);
  expect(before).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.locator("[data-canvas-toast]")).toHaveText(LINK_COPIED);
  await expect(page).toHaveURL(/\/experiments\/workflow-canvas#c\./);
  await expect(page).not.toHaveURL(/flow=/);

  const shared = page.url();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(shared);

  await page.goto("about:blank");
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto(shared);

  await expect(
    page.getByRole("heading", { name: "Support triage" }),
  ).toBeVisible();
  await expect(page.getByText("Lifetime value", { exact: true })).toBeVisible();
  await expect(page.getByText("2 steps", { exact: true })).toBeVisible();
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBe(before);
});

test("changing the hash to a bad link starts fresh", async ({ page }) => {
  await page.goto("/experiments/workflow-canvas?flow=support-triage");
  await expect(
    page.getByRole("heading", { name: "Support triage" }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = "c.not-a-canvas";
  });
  await expect(page.locator("[data-canvas-toast]")).toHaveText(LINK_INVALID);
  await expect(
    page.getByRole("dialog", { name: "Start with a template" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/#c\./);
});

test("an invalid link starts fresh", async ({ page }) => {
  await page.goto("/experiments/workflow-canvas#c.not-a-canvas");
  await expect(page.locator("[data-canvas-toast]")).toHaveText(LINK_INVALID);
  await expect(
    page.getByRole("dialog", { name: "Start with a template" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/#c\./);
});

test("an oversized link starts fresh", async ({ page }) => {
  const hash = `#c.${"a".repeat(MAX_SHARE_URL_LENGTH)}`;
  await page.goto(`/experiments/workflow-canvas${hash}`);
  await expect(page.locator("[data-canvas-toast]")).toHaveText(
    LINK_OPEN_TOO_LONG,
  );
  await expect(
    page.getByRole("dialog", { name: "Start with a template" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/#c\./);
});
