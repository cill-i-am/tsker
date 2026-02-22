import { Layer } from "effect";

import { makeServerLayer } from "@/server.js";

export const runServer = Layer.launch(makeServerLayer());
