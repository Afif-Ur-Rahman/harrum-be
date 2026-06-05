import { connectDB } from "@/config/db";
import { initSocket } from "@/config/socket";
import { PORT, JWT_SECRET, ENCRYPTION_SECRET, DB_URI } from "@/constants/env";
import { LOGUI } from "@/constants/logs";

import { server } from "./server";

// Validate required environment variables before starting
const requiredEnvVars = { JWT_SECRET, ENCRYPTION_SECRET, DB_URI };
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

// Database setup
connectDB();

// Server setup
const port: number = parseInt(PORT as string, 10) || 4000;
initSocket(server).then(() => {
  server.listen(port, () => {
    console.error(LOGUI.FgYellow, `Serving on port ${port}`);
  });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(LOGUI.FgRed, error);
});
