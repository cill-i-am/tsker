const redactedHeaderPatterns = [/authorization/i, /cookie/i, /token/i, /secret/i];

export const shouldRedactHeader = (headerName: string): boolean =>
  redactedHeaderPatterns.some((pattern) => pattern.test(headerName));
