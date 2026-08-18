//Imports
import express from "express";

// Config
const INTERVAL_MS = 5 * 1000;

// Live Stats router
const liveStatsRouter = () => {
  const router = express.Router();

  router.get("/", (req, res) => {
    // Send on an interval
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");

    // Function to send data to the client
    const send = (data) => {
      res.write("data: " + JSON.stringify(data) + "\n\n");
    };

    // Send initial data
    send({ message: "Connected to live stats" });

    // Interval to send live stats every 5 seconds
    const interval = setInterval(() => {
      send({ message: "Live stats update" });
    }, INTERVAL_MS);

    // Clear the interval when the client disconnects
    res.on("close", () => {
      clearInterval(interval);
    });
  });

  return router;
};

export default liveStatsRouter;
