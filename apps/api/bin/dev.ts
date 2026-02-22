import { Effect } from "effect";

import { runServer } from "../src/index.js";

await Effect.runPromise(runServer);
