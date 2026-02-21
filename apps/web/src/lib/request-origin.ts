const extractForwardedValue = (value: string | null) => value?.split(",")[0]?.trim();

const getHostname = (host: string) => {
  const normalized = host.trim().toLowerCase();

  if (normalized.startsWith("[")) {
    const closingBracketIndex = normalized.indexOf("]");
    return closingBracketIndex === -1 ? normalized : normalized.slice(1, closingBracketIndex);
  }

  return normalized.split(":")[0];
};

const isLocalHttpHost = (host: string) => {
  const hostname = getHostname(host);
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "localtest.me" ||
    hostname.endsWith(".localtest.me")
  );
};

export const getForwardedOrigin = (headers: Headers) => {
  const explicitOrigin = headers.get("origin");
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const forwardedProto = extractForwardedValue(headers.get("x-forwarded-proto"));
  const host = extractForwardedValue(headers.get("x-forwarded-host")) ?? headers.get("host");

  if (!host) {
    return;
  }

  const protocol = forwardedProto || (isLocalHttpHost(host) ? "http" : "https");
  return `${protocol}://${host}`;
};
