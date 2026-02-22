import { HttpApi } from "@effect/platform";

import { HealthApi } from "@/features/health/health-api.js";

export const Api = HttpApi.make("api").add(HealthApi);
