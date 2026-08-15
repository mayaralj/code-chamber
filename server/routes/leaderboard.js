// Imports
import express from "express";
import { leaderboardData } from "../leaderboard/precomputeLeaderboard.js";

// Leaderboard router
const leaderboardRouter = () => {
  const router = express.Router();
  // GET /api/leaderboard
  router.get("/", async (req, res) => {
    try {
      // Return the precomputed leaderboard data
      res.json(leaderboardData ?? {});
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  return router;
};

export default leaderboardRouter;
