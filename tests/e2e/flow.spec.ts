import { expect, test } from "@playwright/test";

// One full journey through a case in saved mode. No API key and no cost.
test("handler reviews, signs off and hands over; specialist sends it back", async ({ page }) => {
  await page.goto("/queue");
  await expect(page.getByRole("heading", { name: "Complaints queue" })).toBeVisible();
  await page.getByRole("link", { name: "Mr Kieran Doyle" }).click();

  await expect(page.getByRole("heading", { name: "Mr Kieran Doyle" })).toBeVisible();
  // The injection attempt is flagged, and the AI saw placeholders, not the customer's name.
  await expect(page.getByText("instruction in customer text").first()).toBeVisible();
  await expect(page.locator(".ph").first()).toBeVisible();

  const signOff = page.getByRole("button", { name: /Sign off and hand to/ });
  await expect(signOff).toBeDisabled();

  await page.getByRole("button", { name: /Accept all \d+ verified/ }).click();
  // HV-007's saved run left the payment services rule unclear, so the handler must choose.
  await page.getByLabel(/15 business days, payment services/).check();
  await expect(signOff).toBeEnabled();
  await signOff.click();

  await expect(page.getByText("Could you act on this without contacting anyone?")).toBeVisible();
  await page.getByLabel("No, send it back").check();
  await page.getByLabel("Reason").selectOption({ label: "No customer contact attempted" });
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Sent back by" })).toContainText("Sent back by Fraud and Scams");
  await expect(page.getByText(/sent the case back: No customer contact attempted/)).toBeVisible();
});
