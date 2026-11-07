import { expect, test } from "@playwright/test";

// One full journey through a case in saved mode. No API key and no cost.
test("handler fills every gap before handover; a send-back must be fixed before signing off again", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "Complaints queue" })).toBeVisible();
  await page.getByRole("link", { name: "Mr Kieran Doyle" }).click();

  await expect(page.getByRole("heading", { name: "Mr Kieran Doyle" })).toBeVisible();
  // The injection attempt is flagged, the AI saw placeholders, and the overdue refund duty is shown.
  await expect(page.getByText("instruction in customer text").first()).toBeVisible();
  await expect(page.locator(".ph").first()).toBeVisible();
  await expect(page.getByText("Refund decision due")).toBeVisible();

  await page.getByRole("button", { name: /Accept all \d+ verified/ }).click();
  // Handover is blocked until every checklist gap is filled or explained.
  await expect(page.getByText("Finish the items marked To do to sign off.")).toBeVisible();
  const notAvailable = page.getByRole("button", { name: "Not available" });
  expect(await notAvailable.count()).toBeGreaterThan(0);
  while ((await notAvailable.count()) > 0) {
    await notAvailable.first().click();
    await page.getByLabel("Why it is not available").fill("Asked the customer, awaiting reply");
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }

  await page.getByRole("button", { name: /^Sign off and hand to Fraud and Scams/ }).click();

  // The specialist has their own screen with the handover pack.
  await page.getByRole("link", { name: "Switch to the Fraud and Scams view" }).click();
  await expect(page.getByText("You are now the Fraud and Scams team.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Handover checklist" })).toBeVisible();
  await page.getByLabel("No, send it back to the handler").check();
  await page.getByLabel("What is missing?").selectOption({ label: "No customer contact attempted" });
  await page.getByRole("button", { name: "Confirm decision" }).click();
  await page.getByRole("link", { name: "Switch to the handler's view to fix it" }).click();
  await expect(page.getByText(/Sent back by Fraud and Scams/)).toBeVisible();

  // Signing off again needs a real change first.
  await expect(page.getByRole("button", { name: /Sign off again/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Change" }).first().click();
  await page.getByLabel("Why it is not available").fill("Called customer 9 Nov, no answer, voicemail left");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: /Sign off again and hand to Fraud and Scams/ }).click();
  await page.getByRole("link", { name: "Switch to the Fraud and Scams view" }).click();
  await expect(page.getByText("Called customer 9 Nov, no answer, voicemail left")).toBeVisible();
  await page.getByLabel("Yes, accept the handover").check();
  await page.getByRole("button", { name: "Confirm decision" }).click();
  await expect(page.getByText("You accepted the handover.")).toBeVisible();
});

test("front page replays a real run and ends with every quote checked", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Skip to the end" }).click();
  await expect(page.getByText("34 of 34 quotes found")).toBeVisible();
  await expect(page.getByText("Final response due")).toBeVisible();
  await expect(page.getByRole("link", { name: "Review this case yourself" })).toBeVisible();
});

test("walkthrough shows a failed quote check", async ({ page }) => {
  await page.goto("/walkthrough");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: "See what a failed check looks like" }).click();
  await expect(page.getByText(/Quote not found in the source/)).toBeVisible();
});
