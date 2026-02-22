import { Effect } from "effect";

import { runServer } from "../dist/index.js";

await Effect.runPromise(runServer);
