export const spanNames = {
  httpRequest: "http.request",
  healthCheck: (name: string) => `health.check.${name}`
} as const;
