// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockSignInEmail,
  mockSignOut,
  mockSignUpEmail,
  mockUseSession,
  mockRefetch,
} = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
  mockSignOut: vi.fn(),
  mockSignUpEmail: vi.fn(),
  mockUseSession: vi.fn(),
  mockRefetch: vi.fn(),
}))

vi.mock('../lib/auth-api', () => ({
  signInEmail: mockSignInEmail,
  signOut: mockSignOut,
  signUpEmail: mockSignUpEmail,
}))

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

import { HomePage } from './HomePage'

describe('HomePage sign-in behavior', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockRefetch.mockResolvedValue(undefined)
    mockUseSession.mockReturnValue({
      isPending: false,
      data: null,
      refetch: mockRefetch,
    })

    mockSignInEmail.mockResolvedValue({
      status: 200,
      body: { ok: true },
    })
    mockSignUpEmail.mockResolvedValue({
      status: 200,
      body: { ok: true },
    })
    mockSignOut.mockResolvedValue({
      status: 200,
      body: { ok: true },
    })
  })

  it('shows successful sign-in status and refetches session', async () => {
    render(<HomePage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'person@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123!' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: 'password123!',
      })
    })
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.queryByText(/HTTP 200:/)).not.toBeNull()
    })
  })

  it('shows HTTP status for invalid credentials responses', async () => {
    mockSignInEmail.mockResolvedValueOnce({
      status: 401,
      body: { code: 'INVALID_CREDENTIALS' },
    })

    render(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.queryByText(/HTTP 401:/)).not.toBeNull()
    })
  })

  it('shows request failure message when sign-in rejects', async () => {
    mockSignInEmail.mockRejectedValueOnce(new Error('network down'))

    render(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(screen.queryByText(/Request failed: Error: network down/)).not.toBeNull()
    })
  })

  it('disables auth action buttons while request is in flight', async () => {
    let resolveSignIn: ((value: { status: number; body: unknown }) => void) | undefined
    const signInPromise = new Promise<{ status: number; body: unknown }>((resolve) => {
      resolveSignIn = resolve
    })
    mockSignInEmail.mockReturnValueOnce(signInPromise)

    render(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: 'Sign Up' }) as HTMLButtonElement).disabled,
      ).toBe(true)
      expect(
        (screen.getByRole('button', { name: 'Sign In' }) as HTMLButtonElement).disabled,
      ).toBe(true)
      expect(
        (screen.getByRole('button', { name: 'Sign Out' }) as HTMLButtonElement).disabled,
      ).toBe(true)
    })

    resolveSignIn?.({ status: 200, body: { ok: true } })

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: 'Sign In' }) as HTMLButtonElement).disabled,
      ).toBe(false)
    })
  })
})
