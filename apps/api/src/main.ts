import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { loadConfig } from "./config";
import { makeServerLayer } from "./server";

const config = loadConfig();

NodeRuntime.runMain(
  Layer.launch(makeServerLayer(config) as unknown as never) as unknown as never
);
