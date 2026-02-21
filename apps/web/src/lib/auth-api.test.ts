import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { signInEmail } from './auth-api'

describe('signInEmail', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends a POST request with JSON body and credentials include', async () => {
    const input = { email: 'user@example.com', password: 'password123!' }
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'ok' }), { status: 200 }),
    )

    const result = await signInEmail(input)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(url).toMatch(/\/api\/auth\/sign-in\/email$/)
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    expect(options.headers).toEqual({ 'content-type': 'application/json' })
    expect(options.body).toBe(JSON.stringify(input))
    expect(result).toEqual({
      status: 200,
      body: { token: 'ok' },
    })
  })

  it('returns body null when response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('plain-text-error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }),
    )

    const result = await signInEmail({
      email: 'user@example.com',
      password: 'password123!',
    })

    expect(result).toEqual({
      status: 500,
      body: null,
    })
  })

  it('preserves 4xx status and parsed payload for caller handling', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        }),
        { status: 401 },
      ),
    )

    const result = await signInEmail({
      email: 'user@example.com',
      password: 'wrong-password',
    })

    expect(result.status).toBe(401)
    expect(result.body).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    })
  })
})
