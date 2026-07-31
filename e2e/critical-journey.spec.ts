import { expect, test } from "@playwright/test";
import path from "node:path";

const fixtureCsv = path.join(process.cwd(), "e2e/fixtures/minimal.csv");

test.describe("critical journey", () => {
  const email = `e2e-${Date.now()}@fiscor.ai`;
  const password = "e2epass123";
  const username = "e2euser";

  test("landing shows brand and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Fiscor\s*AI/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Analyse my CSV free/i }).first()).toBeVisible();
  });

  test("sign up, sign in, upload CSV, see report data", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByLabel(/^Username$/i).fill(username);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByLabel(/Confirm password/i).fill(password);
    await page.getByRole("button", { name: /Create account/i }).click();
    await expect(page).toHaveURL(/\/signin/);

    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/graphics/);

    await page.getByRole("link", { name: /VAT reports/i }).click();
    await expect(page).toHaveURL(/\/information/);
    await expect(page.getByRole("heading", { name: /Upload a VAT report/i })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles(fixtureCsv);
    await expect(page.getByText(/Ready to upload|minimal\.csv/i).first()).toBeVisible();
    await page.getByRole("button", { name: /Upload and process/i }).click();
    await expect(page.getByText(/Uploaded and processed successfully/i)).toBeVisible({
      timeout: 45_000,
    });

    await expect(page.getByRole("heading", { name: /Summary/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Germany|France|Italy|Switzerland/i).first()).toBeVisible();

    await page.getByRole("link", { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/\/graphics/);
    await expect(page.getByText(/Sales/i).first()).toBeVisible();
    await expect(page.getByText(/€/).first()).toBeVisible();
  });
});
