import { Schema } from "effect";

export class ConfigLoadError extends Schema.TaggedError<ConfigLoadError>()(
  "ConfigLoadError",
  {
    message: Schema.String,
  }
) {}
