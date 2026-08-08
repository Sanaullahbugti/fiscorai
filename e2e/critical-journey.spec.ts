import { expect, test } from "@playwright/test";
import path from "node:path";

const fixtureCsv = path.join(process.cwd(), "e2e/fixtures/minimal.csv");
const apiBase = "http://localhost:9292";

async function verifyE2eEmail(request: import("@playwright/test").APIRequestContext, email: string) {
  const tokenRes = await request.get(
    `${apiBase}/api/v1/test/verification-token?email=${encodeURIComponent(email)}`,
  );
  if (tokenRes.ok()) {
    const body = await tokenRes.json();
    const token = body?.data?.token;
    if (token) {
      await request.post(`${apiBase}/api/v1/auth/verify-email`, { data: { token } });
    }
  }
}

test.describe("critical journey", () => {
  const email = `e2e-${Date.now()}@fiscor.ai`;
  const password = "e2epass123";
  const username = "e2euser";

  test("landing shows brand and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Fiscor\s*AI/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Check my real numbers free/i }).first()).toBeVisible();
  });

  test("sign up, sign in, upload CSV, see report data", async ({ page, request }) => {
    await page.goto("/signup");
    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByLabel(/^Username$/i).fill(username);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByLabel(/Confirm password/i).fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Create account/i }).click();
    await expect(page.getByText(/check your email|confirm your email/i)).toBeVisible({ timeout: 15_000 });

    await verifyE2eEmail(request, email);

    await page.goto("/signin");
    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByLabel(/^Password$/i).fill(password);
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/(analyst|dashboard)/, { timeout: 20_000 });

    await page.goto("/vat-reports");
    await expect(page.getByRole("heading", { name: /^VAT reports$/i })).toBeVisible();

    const periodSelect = page.getByRole("combobox", { name: /^Period$/i }).first();
    await periodSelect.selectOption("1");
    await page.getByRole("combobox", { name: /^Year$/i }).first().selectOption("2026");

    await page.locator('input[type="file"]').setInputFiles(fixtureCsv);
    await expect(page.getByText(/Uploaded and processed successfully/i)).toBeVisible({
      timeout: 45_000,
    });

    await expect(page.getByText(/Period summary/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("tab", { name: /CH_VOEC|Regular|OSS/i }).first()).toBeVisible();
    await expect(page.getByText(/€50\.00|50\.00/).first()).toBeVisible();

    await page.getByRole("link", { name: /^Dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Sales/i).first()).toBeVisible();
    await expect(page.getByText(/€/).first()).toBeVisible();
  });
});
