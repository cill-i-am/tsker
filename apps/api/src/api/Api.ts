import { HttpApi } from "@effect/platform";

import { HealthApi } from "../features/health/HealthApi.js";

export const Api = HttpApi.make("api").add(HealthApi);
