import app from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log(`ExpenseMate API listening on http://localhost:${config.port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} is already in use. The API may already be running. ` +
        `Stop the existing server or set PORT to an available port before starting another instance.`
    );
    process.exitCode = 1;
    return;
  }

  throw error;
});
