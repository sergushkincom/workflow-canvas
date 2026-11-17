import { expect, type Page, test } from "@playwright/test";

import { NUDGE_MESSAGE } from "../lib/experiments/workflow-canvas/build-helper";

function steps(page: Page) {
  return page.getByRole("listbox", { name: "Workflow steps" });
}

async function closeTemplatePicker(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Start with a template" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

test("idle nudge appears once on the empty canvas", async ({ page }) => {
  await page.goto("/experiments/workflow-canvas?nudgeMs=250");
  await closeTemplatePicker(page);
  await expect(
    page.getByRole("heading", { name: "Untitled workflow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Form → condition → notification" }),
  ).toBeVisible();

  const nudge = page.getByRole("status", { name: NUDGE_MESSAGE });
  await expect(nudge).toBeVisible();
  await expect(nudge).toContainText(NUDGE_MESSAGE);
  await page.getByRole("button", { name: "Dismiss helper suggestion" }).click();
  await expect(nudge).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(nudge).toHaveCount(0);
  await expect(
    page.locator("aside[aria-label='Workflow Builder']"),
  ).toBeVisible();
});

test("trigger picker nudge appears once if no trigger is chosen", async ({
  page,
}) => {
  await page.goto("/experiments/workflow-canvas?nudgeMs=300");
  await closeTemplatePicker(page);
  await page.getByRole("button", { name: "Add first step" }).click();
  const picker = page.getByRole("dialog", { name: "Choose a trigger" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("button", { name: /New ticket received/ })).toBeFocused();

  const nudge = page.getByRole("status", { name: NUDGE_MESSAGE });
  await expect(nudge).toBeVisible();
  await page.getByRole("button", { name: "Dismiss helper suggestion" }).click();
  await expect(nudge).toHaveCount(0);

  await page.getByRole("button", { name: "Close trigger picker" }).click();
  await expect(picker).toBeHidden();
  await page.getByRole("button", { name: "Add first step" }).click();
  await expect(picker).toBeVisible();
  await page.waitForTimeout(600);
  await expect(nudge).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Add first step" }),
  ).toBeFocused();
});

test("allow once applies highlighted nodes and undo restores them", async ({
  page,
}) => {
  await page.goto("/experiments/workflow-canvas?nudgeMs=60000");
  const templates = page.getByRole("dialog", { name: "Start with a template" });
  await templates.getByRole("button", { name: "Start from scratch" }).click();
  await expect(
    page.getByRole("heading", { name: "Untitled workflow" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Help me build" }).click();
  const helper = page.getByRole("region", { name: "Help me build" });
  await expect(helper).toBeVisible();
  await expect(
    helper.getByText("Guides you while you build this workflow."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Notify me when a form is submitted" })
    .click();

  const review = page.getByRole("region", { name: "Review changes" });
  await expect(review.getByText("Set trigger to Incoming webhook")).toBeVisible();
  await expect(review.getByText("Add condition: Channel is API")).toBeVisible();
  await expect(review.getByText("Add Send email")).toBeVisible();
  await expect(
    review.getByText("Connect Incoming webhook → Condition → Send email"),
  ).toBeVisible();

  const allow = page.getByRole("button", { name: "Allow once" });
  await expect(allow).toBeFocused();
  await expect(allow).toHaveAttribute("data-default-permission", "once");
  await expect(page.getByRole("button", { name: "Always allow this session" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await allow.click();

  await expect(steps(page).getByText("Incoming webhook")).toBeVisible();
  await expect(steps(page).getByText("Send email")).toBeVisible();
  await expect(page.locator("[data-build-highlight='true']")).toHaveCount(3);
  await expect(page.getByRole("status", { name: "Change summary" })).toContainText(
    "Trigger set to Incoming webhook",
  );

  await page.getByRole("button", { name: "Daily summary with AI" }).click();
  await expect(page.getByRole("button", { name: "Allow once" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("region", { name: "Review changes" })).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-build-highlight='true']")).toHaveCount(0);
  await expect(steps(page).getByText("Send email")).toHaveCount(0);
  await expect(steps(page).getByText("New ticket received")).toBeVisible();
  await expect(page.getByRole("status", { name: "Change summary" })).toHaveCount(0);
});

test("a starter card opens that workflow in the editor", async ({ page }) => {
  await page.goto("/experiments/workflow-canvas?nudgeMs=60000");
  await closeTemplatePicker(page);
  await page
    .getByRole("button", { name: "Form → condition → notification", exact: true })
    .click();

  await expect(
    page.getByRole("heading", { name: "Form → condition → notification" }),
  ).toBeVisible();
  await expect(steps(page).getByText("Incoming webhook")).toBeVisible();
  await expect(steps(page).getByText("Condition", { exact: true })).toBeVisible();
  await expect(steps(page).getByText("Send email", { exact: true })).toBeVisible();
  await expect(
    page.locator("aside[aria-label='Workflow Builder']"),
  ).toBeVisible();
  await expect(
    page.locator("aside[aria-label='Workflow Builder']"),
  ).toHaveAttribute("data-sidebar-mode", "rail");
});

test("keyboard can approve a helper proposal from the empty canvas", async ({
  page,
}) => {
  await page.goto("/experiments/workflow-canvas?nudgeMs=60000");
  await closeTemplatePicker(page);
  await page.getByRole("button", { name: "Help me build" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Notify me when a form is submitted" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Allow once" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("heading", { name: "Notify me when a form is submitted" }),
  ).toBeVisible();
  await expect(page.locator("[data-build-highlight='true']")).toHaveCount(3);
  await page.getByRole("button", { name: "Undo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-build-highlight='true']")).toHaveCount(0);
  await expect(steps(page).getByText("Send email")).toHaveCount(0);
});
