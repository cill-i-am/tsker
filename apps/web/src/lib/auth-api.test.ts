import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInEmailRequestMock, signOutRequestMock, signUpEmailRequestMock } = vi.hoisted(() => ({
  signInEmailRequestMock: vi.fn(),
  signOutRequestMock: vi.fn(),
  signUpEmailRequestMock: vi.fn(),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    signIn: {
      email: signInEmailRequestMock,
    },
    signOut: signOutRequestMock,
    signUp: {
      email: signUpEmailRequestMock,
    },
    useSession: vi.fn(),
  })),
}));

import {
  signInEmail,
  signOut,
  signUpEmail,
  type AuthMutationResult,
} from "./auth-client";
import {
  signInEmail as signInEmailCompatibility,
  signOut as signOutCompatibility,
  signUpEmail as signUpEmailCompatibility,
} from "./auth-api";

describe("auth-client auth actions", () => {
  beforeEach(() => {
    signUpEmailRequestMock.mockReset();
    signInEmailRequestMock.mockReset();
    signOutRequestMock.mockReset();
  });

  it("maps successful sign-in to a 2xx-compatible result", async () => {
    signInEmailRequestMock.mockResolvedValueOnce({
      data: {
        email: "user@example.com",
      },
      error: null,
    });

    const result = await signInEmail({
      email: "user@example.com",
      password: "password123!",
    });

    expect(signInEmailRequestMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123!",
    });
    expect(result).toStrictEqual<AuthMutationResult>({
      body: {
        email: "user@example.com",
      },
      status: 200,
    });
  });

  it("maps Better Auth error responses to status/body", async () => {
    signUpEmailRequestMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Email already in use",
        status: 409,
      },
    });

    const result = await signUpEmail({
      email: "user@example.com",
      name: "Local User",
      password: "password123!",
    });

    expect(result).toStrictEqual<AuthMutationResult>({
      body: {
        message: "Email already in use",
        status: 409,
      },
      status: 409,
    });
  });

  it("maps sign-out responses", async () => {
    signOutRequestMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await signOut();

    expect(signOutRequestMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual<AuthMutationResult>({
      body: null,
      status: 200,
    });
  });
});

describe("auth-api compatibility layer", () => {
  it("re-exports auth actions from auth-client", () => {
    expect(signInEmailCompatibility).toBe(signInEmail);
    expect(signUpEmailCompatibility).toBe(signUpEmail);
    expect(signOutCompatibility).toBe(signOut);
  });
});
