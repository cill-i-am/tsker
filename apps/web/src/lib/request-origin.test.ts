import { describe, expect, it } from 'vitest'
import { getForwardedOrigin } from './request-origin'

describe('getForwardedOrigin', () => {
  it('returns explicit origin header when present', () => {
    const headers = new Headers({
      origin: 'http://app.localtest.me:3000',
      host: 'app.localtest.me:3000',
    })

    expect(getForwardedOrigin(headers)).toBe('http://app.localtest.me:3000')
  })

  it('uses forwarded protocol and host when provided', () => {
    const headers = new Headers({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'app.example.com',
    })

    expect(getForwardedOrigin(headers)).toBe('https://app.example.com')
  })

  it('defaults to http for localtest hosts', () => {
    const headers = new Headers({
      host: 'app.localtest.me:3000',
    })

    expect(getForwardedOrigin(headers)).toBe('http://app.localtest.me:3000')
  })

  it('defaults to http for localhost hosts', () => {
    const headers = new Headers({
      host: 'localhost:3000',
    })

    expect(getForwardedOrigin(headers)).toBe('http://localhost:3000')
  })

  it('defaults to https for non-local hosts', () => {
    const headers = new Headers({
      host: 'app.example.com',
    })

    expect(getForwardedOrigin(headers)).toBe('https://app.example.com')
  })

  it('returns undefined when no host context exists', () => {
    expect(getForwardedOrigin(new Headers())).toBeUndefined()
  })
})
