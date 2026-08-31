// Imports
import express from "express";
import { leaderboardData } from "../leaderboard/precomputeLeaderboard.js";

// Leaderboard router
const homeLeaderboardRouter = () => {
  const router = express.Router();
  // GET /api/homeLeaderboard
  router.get("/", async (req, res) => {
    try {
      // Return the precomputed leaderboard data with only matches won leaderboard
      res.json(leaderboardData?.["ALL"]?.["ALL"]?.matches_won ?? []);
    } catch (err) {
      console.error("Error fetching home leaderboard data:", err);
      res.status(500).json({ message: "Failed to fetch home leaderboard" });
    }
  });

  return router;
};

export default homeLeaderboardRouter;
