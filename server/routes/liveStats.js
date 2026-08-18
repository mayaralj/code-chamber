// Imports
import express from "express";
import { liveStats } from "../liveStats/precomputeLiveStats.js";

// Config
const SEND_INTERVAL_MS = 10 * 1000;

// Set of connected clients' response objects
const connectedClients = new Set();
let broadcastTimer = null;

// Helper to write an SSE payload to a single client
const sendToClient = (res, data) => {
  res.write("data: " + JSON.stringify(data) + "\n\n");
};

// Helper to write the current liveStats snapshot to every connected client
const broadcastLiveStats = () => {
  const payload = liveStats ?? { message: "Live stats not available yet" };
  for (const res of connectedClients) {
    sendToClient(res, payload);
  }
};

// Start the shared broadcast interval (only runs while at least one client is connected)
const startBroadcasting = () => {
  if (broadcastTimer) return;
  broadcastTimer = setInterval(broadcastLiveStats, SEND_INTERVAL_MS);
};

// Stop the shared broadcast interval once there are no clients left to send to
const stopBroadcasting = () => {
  clearInterval(broadcastTimer);
  broadcastTimer = null;
};

// Live Stats router
const liveStatsRouter = () => {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    // Send an immediate snapshot so the client doesn't wait for the next tick
    sendToClient(res, liveStats ?? { message: "Live stats not available yet" });

    // Register this client and make sure the shared interval is running
    connectedClients.add(res);
    startBroadcasting();

    // Clean up when this client disconnects
    req.on("close", () => {
      connectedClients.delete(res);
      res.end();

      // No point running the interval with nobody listening
      if (connectedClients.size === 0) {
        stopBroadcasting();
      }
    });
  });

  return router;
};

export default liveStatsRouter;
