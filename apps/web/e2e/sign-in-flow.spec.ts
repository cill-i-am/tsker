import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const makeUniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
const loginUrlPattern = /\/login(?:\?.*)?$/;

const fillLoginForm = async (page: Page, input: { email: string; password: string }) => {
  await page.locator("#login-email").fill(input.email);
  await expect(page.locator("#login-email")).toHaveValue(input.email);

  await page.locator("#login-password").fill(input.password);
  await expect(page.locator("#login-password")).toHaveValue(input.password);
};

const submitForgotPasswordForm = async (page: Page, email: string) => {
  const successTitle = page.getByText(/Reset email sent/i);
  const successDescription = page.getByText(/If the account exists, a reset link has been sent/i);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole("button", { name: "Send reset link" }).click();

    try {
      await expect(successTitle).toBeVisible({ timeout: 3000 });
      await expect(successDescription).toBeVisible({ timeout: 3000 });
      return;
    } catch {
      await page.waitForLoadState("networkidle");
      await page.locator("#forgot-email").fill(email);
    }
  }

  await expect(successTitle).toBeVisible();
  await expect(successDescription).toBeVisible();
};

test.describe("sign-in flow", () => {
  test("redirects unauthenticated users from root and guarded routes to login", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(loginUrlPattern);
    await expect(page.getByText("Sign in to tsker")).toBeVisible();

    await page.goto("/onboarding");
    await expect(page).toHaveURL(loginUrlPattern);
    await expect(page.getByText("Sign in to tsker")).toBeVisible();

    await page.goto("/org/guard-check");
    await expect(page).toHaveURL(loginUrlPattern);
    await expect(page.getByText("Sign in to tsker")).toBeVisible();

    await page.goto("/protected");
    await expect(page).toHaveURL(loginUrlPattern);
    await expect(page.getByText("Sign in to tsker")).toBeVisible();
  });

  test("sign up route renders account creation form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.locator("#signup-name")).toBeVisible();
    await expect(page.locator("#signup-email")).toBeVisible();
    await expect(page.locator("#signup-password")).toBeVisible();
    await expect(page.locator("#signup-confirm-password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("forgot password request returns user-safe success state", async ({ page }) => {
    const email = makeUniqueEmail("forgot-password");

    await page.goto("/forgot-password");
    await expect(page.getByText("Forgot your password?")).toBeVisible();
    await page.locator("#forgot-email").fill(email);
    await expect(page.locator("#forgot-email")).toHaveValue(email);
    await submitForgotPasswordForm(page, email);
  });

  test("reset password route loads token from query params", async ({ page }) => {
    const token = `test-token-${Date.now()}`;

    await page.goto(`/reset-password?token=${token}`);
    await expect(page.getByText("Reset your password")).toBeVisible();
    await expect(page.locator("#reset-token")).toHaveValue(token);
  });

  test("rejects sign-in for unknown user", async ({ page }) => {
    const email = makeUniqueEmail("signin-unknown-user");

    await page.goto("/login");
    await expect(page.getByText("Sign in to tsker")).toBeVisible();

    await fillLoginForm(page, {
      email,
      password: "password123!",
    });
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(loginUrlPattern);
    await expect(page.getByText("Sign in to tsker")).toBeVisible();

    await page.goto("/onboarding");
    await expect(page).toHaveURL(loginUrlPattern);
  });
});
