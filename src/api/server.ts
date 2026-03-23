import { serve } from "@hono/node-server";
import app from "./index";

const port = parseInt(process.env.API_PORT ?? "3002");

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`);
});
