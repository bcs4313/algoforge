/**
 * Vercel serverless function entry point.
 * Routes all /api/* requests to the Hono app.
 */
import app from "../src/api/index";
import { handle } from "@hono/node-server/vercel";

export default handle(app);
