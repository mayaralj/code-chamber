// Imports
import { createServer } from "./server.js";
import { createApp } from "./app.js";
import { startPool } from "./executor/containerPool.js";
import { registerShutdownSignals } from "./shutdown.js";
import initSocket from "./socket/socket.js";
import { startBatchTimer } from "./broadcast/broadcastRooms.js";
import { startLeaderboardCompute } from "./leaderboard/precomputeLeaderboard.js";
import { startLiveStatsCompute } from "./liveStats/precomputeLiveStats.js";

// Port
const PORT = process.env.PORT || 5000;

// Server startup function
const serverStartup = async () => {
  try {
    // Start the container pool
    await startPool();

    // Create the app and server
    const app = createApp();
    const { server, io } = createServer(app);

    // Start the leaderboard precomputation on an interval
    startLeaderboardCompute();

    // Start the live stats precomputation on an interval
    startLiveStatsCompute();

    // Start batch broadcast updates for browse page to list all rooms
    startBatchTimer(io);

    // Socket initialization
    initSocket(io);

    // Start the server
    server.listen(PORT, () => {
      console.log(`SERVER STARTED ON PORT ${PORT}`);
    });

    // Register shutdown signals
    registerShutdownSignals();
  } catch (err) {
    // Exit server on error
    console.error("SERVER STARTUP FAILED:", err);
    process.exit(1);
  }
};

// Start the server
serverStartup();
