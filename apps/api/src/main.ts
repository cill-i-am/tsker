import { NodeRuntime } from "@effect/platform-node";
import { Layer } from "effect";

import { loadConfig } from "./config.js";
import { makeServerLayer } from "./server.js";

const config = loadConfig();

NodeRuntime.runMain(Layer.launch(makeServerLayer(config)));
