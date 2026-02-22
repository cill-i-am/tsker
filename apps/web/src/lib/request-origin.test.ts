import { getForwardedOrigin } from "./request-origin";

describe("request origin resolution", () => {
  it("returns explicit origin header when present", () => {
    const headers = new Headers({
      host: "app.localtest.me:3000",
      origin: "http://app.localtest.me:3000",
    });

    expect(getForwardedOrigin(headers)).toBe("http://app.localtest.me:3000");
  });

  it("uses forwarded protocol and host when provided", () => {
    const headers = new Headers({
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "https",
    });

    expect(getForwardedOrigin(headers)).toBe("https://app.example.com");
  });

  it("defaults to http for localtest hosts", () => {
    const headers = new Headers({
      host: "app.localtest.me:3000",
    });

    expect(getForwardedOrigin(headers)).toBe("http://app.localtest.me:3000");
  });

  it("defaults to http for localhost hosts", () => {
    const headers = new Headers({
      host: "localhost:3000",
    });

    expect(getForwardedOrigin(headers)).toBe("http://localhost:3000");
  });

  it("defaults to http for localhost subdomains", () => {
    const headers = new Headers({
      host: "app.tsker.localhost:1355",
    });

    expect(getForwardedOrigin(headers)).toBe("http://app.tsker.localhost:1355");
  });

  it("defaults to https for non-local hosts", () => {
    const headers = new Headers({
      host: "app.example.com",
    });

    expect(getForwardedOrigin(headers)).toBe("https://app.example.com");
  });

  it("returns undefined when no host context exists", () => {
    expect(getForwardedOrigin(new Headers())).toBeUndefined();
  });
});
