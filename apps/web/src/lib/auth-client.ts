import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://api.localtest.me:3002',
  fetchOptions: {
    credentials: 'include',
  },
})
