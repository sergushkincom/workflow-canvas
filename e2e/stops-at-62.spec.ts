import { expect, type Locator, type Page, test } from "@playwright/test";

async function pickOption(page: Page, chip: Locator, optionName: string) {
  await chip.click();
  const menu = page.locator("[data-slot=popover-content]");
  // Option names include a tag ("Email Async"), so match the label text itself.
  await menu
    .getByRole("option")
    .filter({ has: page.getByText(optionName, { exact: true }) })
    .click();
}

test("builds a flow, runs it, and stops at 62% until a person decides", async ({
  page,
}) => {
  await page.goto("/experiments/workflow-canvas");

  await expect(
    page.getByRole("heading", { name: "Support triage" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Test run" })).toBeEnabled();
  await expect(page.getByText("2 steps", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByRole("button", { name: "Condition (If / Else)" }).click();

  await expect(page.getByText("3 steps · 1 incomplete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Test run" })).toBeDisabled();

  await pickOption(
    page,
    page.getByRole("combobox", { name: "Source" }).filter({ hasText: "source" }),
    "Ticket",
  );
  await pickOption(
    page,
    page.getByRole("combobox", { name: "Field" }).filter({ hasText: "field" }),
    "Channel",
  );
  await pickOption(
    page,
    page
      .getByRole("combobox", { name: "Operator" })
      .filter({ hasText: "operator" }),
    "is",
  );
  await pickOption(
    page,
    page.getByRole("combobox", { name: "Value" }).filter({ hasText: "value" }),
    "Email",
  );

  await expect(page.getByText("3 steps", { exact: true })).toBeVisible();
  const testRun = page.getByRole("button", { name: "Test run" });
  await expect(testRun).toBeEnabled();
  await testRun.click();

  const decision = page.getByRole("group", {
    name: "Classify intent decision",
  });
  await expect(decision).toBeVisible({ timeout: 20_000 });
  await expect(decision.getByText("62% confident")).toBeVisible();
  await expect(
    decision.getByText("I'm not confident enough to decide alone."),
  ).toBeVisible();
  await expect(
    decision.getByRole("radio", { name: "Billing dispute" }),
  ).toBeVisible();
  await expect(
    decision.getByRole("radio", { name: "Integration issue" }),
  ).toBeVisible();
  const confirm = decision.getByRole("button", { name: "Confirm and continue" });
  const escalate = decision.getByRole("button", { name: "Route to a human" });
  await expect(confirm).toBeVisible();
  await expect(escalate).toBeVisible();
  await expect(page.getByLabel("Awaiting decision")).toBeVisible();
  await expect(
    page.getByText(
      /auto-?confirm|countdown|confirming in|deciding in|seconds left/i,
    ),
  ).toHaveCount(0);

  const bar = decision.locator(".animate-confidence-fill");
  await expect
    .poll(async () =>
      bar.evaluate((element) => {
        const parent = element.parentElement;
        if (!parent || parent.getBoundingClientRect().width === 0) {
          return -1;
        }
        return Math.round(
          (element.getBoundingClientRect().width /
            parent.getBoundingClientRect().width) *
            100,
        );
      }),
    )
    .toBe(62);

  // The step waits. Nothing counts down, and nothing confirms on its own.
  await page.waitForTimeout(3_000);

  await expect(decision).toBeVisible();
  await expect(confirm).toBeVisible();
  await expect(escalate).toBeVisible();
  await expect(confirm).not.toHaveAttribute("disabled");
  await expect(escalate).not.toHaveAttribute("disabled");
  await expect(page.getByLabel("Awaiting decision")).toBeVisible();
  await expect(page.getByText("Run complete")).toHaveCount(0);
  await expect(
    page.getByText(/confirmed by you|Classified as|Escalated without/),
  ).toHaveCount(0);
  await expect(page.getByText("Routed to Billing")).toHaveCount(0);
});
