import { expect, type Page, test } from "@playwright/test";

function sidebar(page: Page) {
  return page.locator("aside[aria-label='Workflow Builder']");
}

async function expectSidebar(page: Page, mode: "expanded" | "rail") {
  const nav = sidebar(page);
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(40);
  expect(box!.height).toBeGreaterThan(300);
  if (mode === "expanded") {
    expect(box!.width).toBeGreaterThan(200);
    await expect(nav).toHaveAttribute("data-sidebar-mode", "expanded");
    await expect(nav.getByText("Workflow Builder", { exact: true })).toBeVisible();
  } else {
    expect(box!.width).toBeLessThan(80);
    await expect(nav).toHaveAttribute("data-sidebar-mode", "rail");
    await expect(nav.getByText("Workflow Builder", { exact: true })).toHaveCount(0);
  }
}

async function expectNavButtons(page: Page) {
  const nav = sidebar(page).getByRole("navigation", { name: "Primary" });
  for (const name of [
    "Home",
    "Workflows",
    "Templates",
    "Executions",
    "Credentials",
    "Settings",
  ]) {
    await expect(nav.getByRole("button", { name })).toBeVisible();
  }
}

async function expectSidebarNotCovered(page: Page) {
  const navBox = await sidebar(page).boundingBox();
  const overlayBox = await page.locator("[data-slot=dialog-overlay]").boundingBox();
  const dialogBox = await page.getByRole("dialog").boundingBox();
  expect(navBox).not.toBeNull();
  expect(overlayBox).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  expect(overlayBox!.x).toBeGreaterThanOrEqual(navBox!.x + navBox!.width - 1);
  expect(dialogBox!.x).toBeGreaterThanOrEqual(navBox!.x + navBox!.width - 1);
}

test("new user filters templates and edits the one they pick", async ({
  page,
}) => {
  await page.goto("/experiments/workflow-canvas");

  const dialog = page.getByRole("dialog", { name: "Start with a template" });
  await expect(dialog).toBeVisible();
  await expectSidebar(page, "expanded");
  await expectSidebarNotCovered(page);
  await expect(
    dialog.getByRole("searchbox", { name: "Search templates" }),
  ).toBeFocused();
  // The shell stays on screen behind the dialog. Radix hides it from the
  // accessibility tree until the dialog closes.
  await expect(
    page.locator("h1", { hasText: "Untitled workflow" }),
  ).toBeVisible();

  // Tab from the close control stays inside the dialog. Native selects are
  // skipped here because a headless dropdown can swallow the next key.
  await dialog.getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("searchbox", { name: "Search templates" }),
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Untitled workflow" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("button", { name: "Add first step" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await expect(dialog).toBeVisible();

  const search = dialog.getByRole("searchbox", { name: "Search templates" });
  await search.fill("digest");
  await expect(
    dialog.getByRole("radio", { name: "Daily inbox digest" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Triage support tickets" }),
  ).toHaveCount(0);
  await expect(dialog.getByText("No template matches that.")).toHaveCount(0);

  await search.fill("zzzz-no-match");
  await expect(dialog.getByText("No template matches that.")).toBeVisible();
  await search.fill("");

  await dialog.getByText("Notifications", { exact: true }).click();
  await expect(
    dialog.getByRole("radio", { name: "Daily inbox digest" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Triage support tickets" }),
  ).toHaveCount(0);

  await dialog.getByText("All", { exact: true }).click();
  await dialog.getByLabel("Apps").selectOption({ label: "Summarise thread" });
  await expect(
    dialog.getByRole("radio", { name: "Daily inbox digest" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Draft replies for review" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Triage support tickets" }),
  ).toHaveCount(0);

  await dialog.getByLabel("Apps").selectOption({ label: "Any" });
  await dialog.getByLabel("Sort").selectOption({ label: "Name" });
  await expect(
    dialog.getByRole("radiogroup", { name: "Templates" }).getByRole("radio").first(),
  ).toHaveAttribute("aria-label", "Alert on failed payments");

  await dialog
    .getByRole("radiogroup", { name: "Templates" })
    .getByText("Triage support tickets", { exact: true })
    .click();
  await expect(dialog.getByText("Selected: Triage support tickets")).toBeVisible();
  await dialog.getByRole("button", { name: "Edit this template" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Triage support tickets" }),
  ).toBeVisible();
  await expectSidebar(page, "rail");
  await expectNavButtons(page);
  const value = page.getByRole("spinbutton", { name: "Value" });
  await expect(value).toHaveValue("5000");
  await value.fill("6000");
  await expect(value).toHaveValue("6000");
  await expect(page.getByRole("button", { name: "Test run" })).toBeEnabled();

  await page.getByRole("button", { name: "Templates", exact: true }).click();
  await expect(dialog).toBeVisible();
});

test("start from scratch opens an empty editable canvas", async ({ page }) => {
  await page.goto("/experiments/workflow-canvas");
  const dialog = page.getByRole("dialog", { name: "Start with a template" });
  await dialog.getByRole("button", { name: "Start from scratch" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Untitled workflow" }),
  ).toBeVisible();
  await expect(page.getByText("1 step", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByRole("button", { name: "Condition (If / Else)" }).click();
  await expect(page.getByText("2 steps · 1 incomplete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Test run" })).toBeDisabled();
});

test("keyboard opens the selected template", async ({ page }) => {
  await page.goto("/experiments/workflow-canvas");
  const dialog = page.getByRole("dialog", { name: "Start with a template" });
  await dialog.getByRole("radio", { name: "Triage support tickets" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Triage support tickets" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Test run" })).toBeEnabled();
});

test.describe("narrow viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("template picker stays usable on a phone", async ({ page }) => {
    await page.goto("/experiments/workflow-canvas");
    const dialog = page.getByRole("dialog", { name: "Start with a template" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeInViewport();
    await expectSidebar(page, "rail");
    await expectSidebarNotCovered(page);
    await dialog.getByRole("searchbox", { name: "Search templates" }).fill("triage");
    await dialog
      .getByRole("radiogroup", { name: "Templates" })
      .getByText("Triage support tickets", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Edit this template" }).click();
    await expect(
      page.getByRole("heading", { name: "Triage support tickets" }),
    ).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Value" })).toBeVisible();
    await expectSidebar(page, "rail");
    await expectNavButtons(page);
  });
});

test("sidebar stays visible at desktop, tablet, and phone", async ({ page }) => {
  const sizes = [
    { label: "desktop", width: 1440, height: 900, home: "expanded" as const },
    { label: "tablet", width: 768, height: 1024, home: "rail" as const },
    { label: "phone", width: 390, height: 844, home: "rail" as const },
  ];

  for (const size of sizes) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto("/experiments/workflow-canvas");
    const dialog = page.getByRole("dialog", { name: "Start with a template" });
    await expect(dialog, size.label).toBeVisible();
    await expectSidebar(page, size.home);
    await expectSidebarNotCovered(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expectNavButtons(page);

    await sidebar(page).getByRole("button", { name: "Templates" }).click();
    await dialog.getByRole("button", { name: "Start from scratch" }).click();
    await expect(
      page.getByRole("heading", { name: "Untitled workflow" }),
    ).toBeVisible();
    await expectSidebar(page, "rail");
    await expectNavButtons(page);
  }
});
