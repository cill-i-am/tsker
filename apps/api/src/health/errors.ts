import { Data } from "effect";

export class ReadinessError extends Data.TaggedError("ReadinessError")<{
  readonly message: string;
}> {}
