// Imports
import { createServer } from "./server.js";
import { createApp } from "./app.js";
import { startPool } from "./executor/containerPool.js";
import { registerShutdownSignals } from "./shutdown.js";
import initSocket from "./socket/socket.js";
import db from "./db.js";
import { startBatchTimer } from "./broadcast/broadcastRooms.js";

// Port
const PORT = process.env.PORT || 5000;

// Server startup function
const serverStartup = async () => {
  try {
    // List out all of the queries
    const queries = {
      //questions: "SELECT * FROM questions",
    };

    // Run all of the queries
    const keys = Object.keys(queries);
    const results = await Promise.all(
      keys.map((key) => db.query(queries[key])),
    );

    // Store the results in a data object
    const data = Object.fromEntries(
      keys.map((key, index) => [key, results[index].rows]),
    );

    console.log("All queries executed successfully");

    // Start the container pool
    await startPool();

    // Create the app and server
    const app = createApp();
    const { server, io } = createServer(app);

    // Start batch broadcast updates for browse page to list all rooms
    startBatchTimer(io);

    // Socket initialization
    initSocket(io, { ...data });

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
