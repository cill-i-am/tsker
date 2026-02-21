import { expect, test, type Page } from '@playwright/test'

const makeUniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

const fillCredentials = async (
  page: Page,
  input: { email: string; password: string; name?: string },
) => {
  const nameInput = page.getByRole('textbox', { name: 'Name', exact: true })
  const emailInput = page.getByRole('textbox', { name: 'Email', exact: true })
  const passwordInput = page.getByRole('textbox', { name: 'Password', exact: true })

  if (input.name) {
    await nameInput.fill(input.name)
    await expect(nameInput).toHaveValue(input.name)
  }

  await emailInput.fill(input.email)
  await expect(emailInput).toHaveValue(input.email)

  await passwordInput.fill(input.password)
  await expect(passwordInput).toHaveValue(input.password)
}

const expectHttpStatus = async (
  page: Page,
  statusFamily: 2 | 4,
) => {
  const credentialsSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Credentials' }) })
  const statusText = credentialsSection.locator('p').filter({
    hasText: new RegExp(`^HTTP ${statusFamily}\\d\\d:`),
  })

  await expect(statusText).toBeVisible({ timeout: 10_000 })
}

const waitForInteractiveSessionState = async (page: Page) => {
  await expect(page.getByText(/Pending:\s*no/)).toBeVisible({ timeout: 15_000 })
}

test.describe('sign-in flow', () => {
  test('signs up, signs out, signs in, and accesses protected route', async ({
    page,
  }) => {
    const password = 'password123!'
    const email = makeUniqueEmail('signin-happy')

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Auth Session Validation' })).toBeVisible()
    await waitForInteractiveSessionState(page)

    await fillCredentials(page, {
      name: 'Sign In Happy User',
      email,
      password,
    })
    await page.getByRole('button', { name: 'Sign Up' }).click()
    await expectHttpStatus(page, 2)

    await page.getByRole('button', { name: 'Sign Out' }).click()
    await expectHttpStatus(page, 2)

    await page.getByRole('button', { name: 'Sign In' }).click()
    await expectHttpStatus(page, 2)

    await page.getByRole('link', { name: 'Open Protected Route Check' }).click()
    await expect(page).toHaveURL(/\/protected$/)
    await expect(page.getByText(/Authenticated:\s*yes/)).toBeVisible()
  })

  test('rejects sign-in when password is invalid', async ({ page }) => {
    const validPassword = 'password123!'
    const email = makeUniqueEmail('signin-wrong-password')

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Auth Session Validation' })).toBeVisible()
    await waitForInteractiveSessionState(page)

    await fillCredentials(page, {
      name: 'Wrong Password User',
      email,
      password: validPassword,
    })
    await page.getByRole('button', { name: 'Sign Up' }).click()
    await expectHttpStatus(page, 2)

    await page.getByRole('button', { name: 'Sign Out' }).click()
    await expectHttpStatus(page, 2)

    await fillCredentials(page, {
      email,
      password: 'wrong-password-123!',
    })
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expectHttpStatus(page, 4)

    await page.getByRole('link', { name: 'Open Protected Route Check' }).click()
    await expect(page).toHaveURL(/\/protected$/)
    await expect(page.getByText(/Authenticated:\s*no/)).toBeVisible()
  })

  test('rejects sign-in for unknown user', async ({ page }) => {
    const email = makeUniqueEmail('signin-unknown-user')

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Auth Session Validation' })).toBeVisible()
    await waitForInteractiveSessionState(page)

    await fillCredentials(page, {
      name: 'Unknown User',
      email,
      password: 'password123!',
    })
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expectHttpStatus(page, 4)

    await page.getByRole('link', { name: 'Open Protected Route Check' }).click()
    await expect(page).toHaveURL(/\/protected$/)
    await expect(page.getByText(/Authenticated:\s*no/)).toBeVisible()
  })

  test('shows protected route as unauthenticated when user is not logged in', async ({
    page,
  }) => {
    await page.goto('/protected')

    await expect(
      page.getByRole('heading', { name: 'Protected Session Check' }),
    ).toBeVisible()
    await expect(page.getByText(/Status:\s*200/)).toBeVisible()
    await expect(page.getByText(/Authenticated:\s*no/)).toBeVisible()
  })
})
