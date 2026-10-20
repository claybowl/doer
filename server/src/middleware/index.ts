export { logger, httpLogger } from "./logger.js";
export { errorHandler } from "./error-handler.js";
export { validate } from "./validate.js";

// NOTE: permission guards are intentionally NOT re-exported here.
// Import them directly from "./middleware/permission-guard.js" when needed.
// Re-exporting them drags `services/access.js` + `@doerai/shared` into every
// module that imports this barrel (16 route tests import `errorHandler` from
// here), which pushed those suites past vitest's 5s per-test timeout.

