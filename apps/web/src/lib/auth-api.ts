const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://api.localtest.me:3002'

const postAuth = async (path: string, body: Record<string, unknown>) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  return {
    status: response.status,
    body: await response.json().catch(() => null),
  }
}

export const signUpEmail = (input: {
  email: string
  password: string
  name: string
}) => postAuth('/api/auth/sign-up/email', input)

export const signInEmail = (input: { email: string; password: string }) =>
  postAuth('/api/auth/sign-in/email', input)

export const signOut = () => postAuth('/api/auth/sign-out', {})
