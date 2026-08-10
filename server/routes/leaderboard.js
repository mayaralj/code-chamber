// Imports
import express from "express";
import db from "../db.js";

// Leaderboard router
const leaderboardRouter = () => {
  // Init the router
  const router = express.Router();

  // GET /api/leaderboard
  router.get("/", async (req, res) => {
    try {
      // Place all in a promise.all to speed up the queries
      const [
        matchesWon,
        matchesPlayed,
        winRate,
        executionTime,
        submissionTime,
      ] = await Promise.all([
        db.query(
          "SELECT u.username, u.display_name, p.matches_won FROM profile_stats p JOIN users u ON p.user_id = u.id ORDER BY matches_won DESC LIMIT 10",
        ),
        db.query(
          "SELECT u.username, u.display_name, p.matches_played FROM profile_stats p JOIN users u ON p.user_id = u.id ORDER BY matches_played DESC LIMIT 10",
        ),
        db.query(
          `SELECT u.username, u.display_name,
                  (p.matches_won::float / p.matches_played) AS win_rate
            FROM profile_stats p
            JOIN users u ON p.user_id = u.id
            WHERE p.matches_played >= 10
            ORDER BY win_rate DESC
            LIMIT 10`,
        ),
        db.query(
          `SELECT u.username, u.display_name, p.avg_execution_time

            FROM profile_stats p
            JOIN users u ON p.user_id = u.id
            WHERE p.avg_execution_time IS NOT NULL
            ORDER BY p.avg_execution_time ASC
            LIMIT 10`,
        ),
        db.query(
          `SELECT u.username, u.display_name, p.avg_submit_time
            FROM profile_stats p
            JOIN users u ON p.user_id = u.id
            WHERE p.avg_submit_time IS NOT NULL
            ORDER BY p.avg_submit_time ASC
            LIMIT 10`,
        ),
      ]);
      res.json({
        matchesWon,
        matchesPlayed,
        winRate,
        executionTime,
        submissionTime,
      });
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};

export default leaderboardRouter;
