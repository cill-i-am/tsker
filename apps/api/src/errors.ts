import { Schema } from "effect";

export class ConfigLoadError extends Schema.TaggedError<ConfigLoadError>()("ConfigLoadError", {
  message: Schema.String
}) {}

export class AuthIntegrationError extends Schema.TaggedError<AuthIntegrationError>()(
  "AuthIntegrationError",
  {
    message: Schema.String
  }
) {}
