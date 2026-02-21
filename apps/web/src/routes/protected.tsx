import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

const getApiBaseUrl = () =>
  process.env.VITE_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://api.localtest.me:3002'

const getForwardedOrigin = (headers: Headers) => {
  const explicitOrigin = headers.get('origin')

  if (explicitOrigin) {
    return explicitOrigin
  }

  const forwardedProto = headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
  const forwardedHost = headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim()
  const host = forwardedHost || headers.get('host')

  if (!host) {
    return undefined
  }

  const protocol =
    forwardedProto ||
    (host.includes('localhost') || host.includes('127.0.0.1')
      ? 'http'
      : 'https')

  return `${protocol}://${host}`
}

const fetchProtectedSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const headers = getRequestHeaders()
    const origin = getForwardedOrigin(headers)
    const requestHeaders: Record<string, string> = {
      cookie: headers.get('cookie') ?? '',
    }

    if (origin) {
      requestHeaders.origin = origin
    }

    const response = await fetch(`${getApiBaseUrl()}/api/auth/get-session`, {
      headers: requestHeaders,
      credentials: 'include',
    })

    const payload = await response.json().catch(() => null)
    const authenticated = Boolean(payload?.session && payload?.user)

    return {
      status: response.status,
      authenticated,
      payload,
    }
  },
)

export const Route = createFileRoute('/protected')({
  loader: () => fetchProtectedSession(),
  component: ProtectedPage,
})

function ProtectedPage() {
  const data = Route.useLoaderData()

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <h2 className="text-2xl font-semibold">Protected Session Check</h2>
      <p className="mt-2 text-gray-300">
        This route does a server-side call to <code>/api/auth/get-session</code>{' '}
        while forwarding the incoming cookie header.
      </p>

      <div className="mt-6 rounded border border-slate-700 bg-slate-900 p-4">
        <p>
          <strong>Status:</strong> {data.status}
        </p>
        <p>
          <strong>Authenticated:</strong>{' '}
          {data.authenticated ? 'yes' : 'no'}
        </p>
      </div>

      <pre className="mt-4 overflow-auto rounded border border-slate-700 bg-slate-950 p-4 text-xs text-slate-200">
        {JSON.stringify(data.payload, null, 2)}
      </pre>

      <Link
        to="/"
        className="mt-4 inline-block rounded bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500"
      >
        Back Home
      </Link>
    </main>
  )
}
