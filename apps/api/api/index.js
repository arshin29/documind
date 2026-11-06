/**
 * Vercel Serverless Function entry point.
 * Delegates execution to the pre-compiled NestJS serverless handler in dist/serverless.
 * This ensures full decorator metadata and dependency injection are preserved.
 */
const serverless = require('../dist/serverless');

module.exports = serverless.default || serverless;
