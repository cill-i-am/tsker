import type { ProtectedSessionResponse } from "@/lib/session.functions";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getSessionUser = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const user = payload.user;

  return isRecord(user) ? user : null;
};

export const isSessionEmailVerified = (session: ProtectedSessionResponse): boolean => {
  if (!session.authenticated) {
    return false;
  }

  const user = getSessionUser(session.payload);

  if (!user) {
    return false;
  }

  return user.emailVerified === true || user.email_verified === true;
};

export const getSessionEmail = (session: ProtectedSessionResponse): string | null => {
  if (!session.authenticated) {
    return null;
  }

  const user = getSessionUser(session.payload);
  const email = user?.email;

  return typeof email === "string" ? email : null;
};
