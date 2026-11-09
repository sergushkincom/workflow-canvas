import { register } from "node:module";

// Loaded via `node --import` before the test runner so extensionless
// TypeScript imports (and the `@/` alias) resolve inside each test process.
register("./test-resolve-hook.mjs", import.meta.url);
