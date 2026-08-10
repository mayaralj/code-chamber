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
      const [
        matchesWon,
        matchesPlayed,
        winRate,
        executionTime,
        submissionTime,
      ] = await Promise.all([
        db.query(
          `SELECT u.username, u."displayUsername", p.matches_won
     FROM profile_stats p
     JOIN "user" u ON p.user_id = u.id
     ORDER BY matches_won DESC LIMIT 10`,
        ),
        db.query(
          `SELECT u.username, u."displayUsername", p.matches_played
     FROM profile_stats p
     JOIN "user" u ON p.user_id = u.id
     ORDER BY matches_played DESC LIMIT 10`,
        ),
        db.query(
          `SELECT u.username, u."displayUsername",
            (p.matches_won::float / p.matches_played) AS win_rate
     FROM profile_stats p
     JOIN "user" u ON p.user_id = u.id
     WHERE p.matches_played >= 10
     ORDER BY win_rate DESC
     LIMIT 10`,
        ),
        db.query(
          `SELECT u.username, u."displayUsername", p.avg_execution_time
     FROM profile_stats p
     JOIN "user" u ON p.user_id = u.id
     WHERE p.avg_execution_time IS NOT NULL
     ORDER BY p.avg_execution_time ASC
     LIMIT 10`,
        ),
        db.query(
          `SELECT u.username, u."displayUsername", p.avg_submit_time
     FROM profile_stats p
     JOIN "user" u ON p.user_id = u.id
     WHERE p.avg_submit_time IS NOT NULL
     ORDER BY p.avg_submit_time ASC
     LIMIT 10`,
        ),
      ]);

      res.json({
        matchesWon: matchesWon.rows,
        matchesPlayed: matchesPlayed.rows,
        winRate: winRate.rows,
        executionTime: executionTime.rows,
        submissionTime: submissionTime.rows,
      });
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  return router;
};

export default leaderboardRouter;
