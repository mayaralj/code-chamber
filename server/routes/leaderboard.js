// Imports
import express from "express";
import db from "../db.js";
import { sleep } from "../utils/timers.js";

// Leaderboard router
const leaderboardRouter = () => {
  const router = express.Router();
  // Simulate a delay to show the loading indicator
  router.get("/", async (req, res) => {
    try {
      const { language, difficulty } = req.query;
      const includeMatches = !language || language === "ALL";

      // Build submissions WHERE clause (supports both filters)
      const subFilters = [];
      const subParams = [];
      if (language && language !== "ALL") {
        subParams.push(language);
        subFilters.push(`language = $${subParams.length}`);
      }
      if (difficulty && difficulty !== "ALL") {
        subParams.push(difficulty);
        subFilters.push(`difficulty = $${subParams.length}`);
      }
      const subWhere = subFilters.length
        ? `WHERE ${subFilters.join(" AND ")}`
        : "";

      // Build matches WHERE clause (difficulty only)
      const matchParams = [];
      let matchWhere = "";
      if (includeMatches && difficulty && difficulty !== "ALL") {
        matchParams.push(difficulty);
        matchWhere = `WHERE difficulty = $1`;
      }

      const queries = {
        total_submissions: db.query(
          `SELECT u.username, u."displayUsername", agg.total_submissions
         FROM (SELECT user_id, COUNT(*)::int AS total_submissions
               FROM submissions ${subWhere} GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY total_submissions DESC LIMIT 10`,
          subParams,
        ),
        passed_submissions: db.query(
          `SELECT u.username, u."displayUsername", agg.passed_submissions
         FROM (SELECT user_id, COUNT(*) FILTER (WHERE passed)::int AS passed_submissions
               FROM submissions ${subWhere} GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY passed_submissions DESC LIMIT 10`,
          subParams,
        ),
        pass_rate: db.query(
          `SELECT u.username, u."displayUsername", agg.pass_rate
         FROM (SELECT user_id, (COUNT(*) FILTER (WHERE passed))::float / COUNT(*) AS pass_rate
               FROM submissions ${subWhere} GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY pass_rate DESC LIMIT 10`,
          subParams,
        ),
        avg_execution_time: db.query(
          `SELECT u.username, u."displayUsername", agg.avg_execution_time
         FROM (SELECT user_id, AVG(execution_time) AS avg_execution_time
               FROM submissions ${subWhere ? subWhere + " AND execution_time IS NOT NULL" : "WHERE execution_time IS NOT NULL"}
               GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY avg_execution_time ASC LIMIT 10`,
          subParams,
        ),
        avg_submission_time: db.query(
          `SELECT u.username, u."displayUsername", agg.avg_submission_time
         FROM (SELECT user_id, AVG(submit_time) AS avg_submission_time
               FROM submissions ${subWhere ? subWhere + " AND submit_time IS NOT NULL" : "WHERE submit_time IS NOT NULL"}
               GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY avg_submission_time ASC LIMIT 10`,
          subParams,
        ),
        test_cases_passed: db.query(
          `SELECT u.username, u."displayUsername", agg.test_cases_passed
         FROM (SELECT user_id, COALESCE(SUM(test_cases_passed), 0)::int AS test_cases_passed
               FROM submissions ${subWhere} GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY test_cases_passed DESC LIMIT 10`,
          subParams,
        ),
      };

      if (includeMatches) {
        queries.matches_won = db.query(
          `SELECT u.username, u."displayUsername", agg.matches_won
         FROM (SELECT user_id, COUNT(*) FILTER (WHERE won)::int AS matches_won
               FROM matches ${matchWhere} GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY matches_won DESC LIMIT 10`,
          matchParams,
        );
        queries.matches_played = db.query(
          `SELECT u.username, u."displayUsername", agg.matches_played
         FROM (SELECT user_id, COUNT(*)::int AS matches_played
               FROM matches ${matchWhere} GROUP BY user_id) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY matches_played DESC LIMIT 10`,
          matchParams,
        );
        queries.win_rate = db.query(
          `SELECT u.username, u."displayUsername", agg.win_rate
         FROM (SELECT user_id, (COUNT(*) FILTER (WHERE won))::float / COUNT(*) AS win_rate
               FROM matches ${matchWhere} GROUP BY user_id
               HAVING COUNT(*) >= 10) agg
         JOIN "user" u ON agg.user_id = u.id
         ORDER BY win_rate DESC LIMIT 10`,
          matchParams,
        );
      }

      const keys = Object.keys(queries);
      const results = await Promise.all(Object.values(queries));

      const response = {};
      keys.forEach((key, i) => {
        response[key] = results[i].rows;
      });

      res.json(response);
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  return router;
};

export default leaderboardRouter;
