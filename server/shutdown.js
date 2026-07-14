import { stopPool } from "./executor/containerPool.js";

// Shutdown handler
const serverShutdown = async (signal) => {
  console.log(`---SHUTTING DOWN SERVER (${signal})---`);
  try {
    await stopPool();
  } catch (error) {
    console.error("Error during pool shutdown:", error);
  } finally {
    console.log("SERVER HAS BEEN SHUTDOWN");
    process.exit(0);
  }
};

// Register shutdown signals
export const registerShutdownSignals = () => {
  process.on("SIGINT", async () => {
    process.exitCode = 0;
    await serverShutdown("SIGINT");
  });
  process.on("SIGTERM", async () => {
    process.exitCode = 0;
    await serverShutdown("SIGTERM");
  });
};
