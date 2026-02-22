import { signInEmail } from "./auth-api";

const makeFetchMock = () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const resetFetchMock = () => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
};

describe("auth api sign-in", () => {
  it("sends a POST request with JSON body and credentials include", async () => {
    const fetchMock = makeFetchMock();
    const input = { email: "user@example.com", password: "password123!" };
    fetchMock.mockResolvedValueOnce(Response.json({ token: "ok" }, { status: 200 }));

    try {
      await signInEmail(input);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://auth.tsker.localhost:1355/api/auth/sign-in/email",
        expect.objectContaining({
          body: JSON.stringify(input),
          credentials: "include",
          headers: { "content-type": "application/json" },
          method: "POST",
        }),
      );
    } finally {
      resetFetchMock();
    }
  });

  it("returns body null when response is not JSON", async () => {
    const fetchMock = makeFetchMock();
    fetchMock.mockResolvedValueOnce(
      new Response("plain-text-error", {
        headers: { "content-type": "text/plain" },
        status: 500,
      }),
    );

    try {
      const result = await signInEmail({
        email: "user@example.com",
        password: "password123!",
      });

      expect(result).toStrictEqual({
        body: null,
        status: 500,
      });
    } finally {
      resetFetchMock();
    }
  });

  it("preserves 4xx status and parsed payload for caller handling", async () => {
    const fetchMock = makeFetchMock();
    fetchMock.mockResolvedValueOnce(
      Response.json(
        {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
        { status: 401 },
      ),
    );

    try {
      const result = await signInEmail({
        email: "user@example.com",
        password: "wrong-password",
      });

      expect(result).toStrictEqual({
        body: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
        status: 401,
      });
    } finally {
      resetFetchMock();
    }
  });
});
