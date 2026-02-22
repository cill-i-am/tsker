import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL ?? "http://auth.tsker.localhost:1355",
  fetchOptions: {
    credentials: "include",
  },
});

export interface AuthMutationResult {
  body: unknown;
  status: number;
}

export interface SignUpEmailInput {
  email: string;
  name: string;
  password: string;
}

export interface SignInEmailInput {
  email: string;
  password: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorStatus = (error: unknown): number | null => {
  if (!isRecord(error)) {
    return null;
  }

  const status = error.status;
  return typeof status === "number" ? status : null;
};

const toAuthMutationResult = (result: unknown): AuthMutationResult => {
  if (isRecord(result) && result.error) {
    return {
      body: result.error,
      status: getErrorStatus(result.error) ?? 500,
    };
  }

  if (isRecord(result) && "data" in result) {
    return {
      body: result.data ?? null,
      status: 200,
    };
  }

  return {
    body: result ?? null,
    status: 200,
  };
};

export const signUpEmail = async (input: SignUpEmailInput): Promise<AuthMutationResult> =>
  toAuthMutationResult(await authClient.signUp.email(input));

export const signInEmail = async (input: SignInEmailInput): Promise<AuthMutationResult> =>
  toAuthMutationResult(await authClient.signIn.email(input));

export const signOut = async (): Promise<AuthMutationResult> =>
  toAuthMutationResult(await authClient.signOut());
