import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { makeServerLayer } from "./server.js";

Layer.launch(makeServerLayer()).pipe(NodeRuntime.runMain);
