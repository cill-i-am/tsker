import { config } from "@repo/eslint-config/react-internal";

export default [
  {
    ignores: [".output/**", ".nitro/**", ".vinxi/**"]
  },
  ...config
];
