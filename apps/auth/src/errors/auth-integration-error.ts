import { Schema } from "effect";

export class AuthIntegrationError extends Schema.TaggedError<AuthIntegrationError>()(
  "AuthIntegrationError",
  {
    message: Schema.String,
  },
) {}
