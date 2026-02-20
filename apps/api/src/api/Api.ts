import { HttpApi } from "@effect/platform";

import { HealthApi } from "./HealthApi.js";

export const Api = HttpApi.make("api").add(HealthApi);
