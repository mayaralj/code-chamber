// Imports
import express from "express";
import db from "../db.js";

// Helper to query for all total stats (not language specific) for the leaderboard
const getTotalStats = () => {
  return Promise.all([
    db.query(`SELECT u.username, u."displayUsername", p.matches_won
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      ORDER BY matches_won DESC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername", p.matches_played
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      ORDER BY matches_played DESC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername",
          (p.matches_won::float / p.matches_played) AS win_rate
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      WHERE p.matches_played >= 10
      ORDER BY win_rate DESC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername", p.avg_execution_time
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      WHERE p.avg_execution_time IS NOT NULL
      ORDER BY p.avg_execution_time ASC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername", p.avg_submission_time
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      WHERE p.avg_submission_time IS NOT NULL
      ORDER BY p.avg_submission_time ASC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername", p.total_submissions
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      ORDER BY p.total_submissions DESC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername", p.passed_submissions
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      ORDER BY p.passed_submissions DESC LIMIT 10`),

    db.query(`SELECT u.username, u."displayUsername", p.test_cases_passed
      FROM profile_stats p
      JOIN "user" u ON p.user_id = u.id
      ORDER BY p.test_cases_passed DESC LIMIT 10`),
  ]);
};

// Helper to query for language stats for the leaderboard
const getAllLanguageStats = () => {
  return Promise.all([
    db.query(`
      SELECT username, "displayUsername", language, total_submissions, rn
      FROM (
        SELECT u.username, u."displayUsername", ls.language,
              ls.total_submissions,
              ROW_NUMBER() OVER (PARTITION BY ls.language ORDER BY ls.total_submissions DESC) AS rn
        FROM language_stats ls
        JOIN "user" u ON ls.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn;
    `),

    db.query(`
      SELECT username, "displayUsername", language, passed_submissions, rn
      FROM (
        SELECT u.username, u."displayUsername", ls.language,
               ls.passed_submissions,
               ROW_NUMBER() OVER (PARTITION BY ls.language ORDER BY ls.passed_submissions DESC) AS rn
        FROM language_stats ls
        JOIN "user" u ON ls.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn;
    `),

    db.query(`
      SELECT username, "displayUsername", language, avg_submission_time, rn
      FROM (
        SELECT u.username, u."displayUsername", ls.language,
               ls.avg_submission_time,
               ROW_NUMBER() OVER (PARTITION BY ls.language ORDER BY ls.avg_submission_time ASC) AS rn
        FROM language_stats ls
        JOIN "user" u ON ls.user_id = u.id
        WHERE ls.avg_submission_time IS NOT NULL
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn;
    `),

    db.query(`
      SELECT username, "displayUsername", language, avg_execution_time, rn
      FROM (
        SELECT u.username, u."displayUsername", ls.language,
               ls.avg_execution_time,
               ROW_NUMBER() OVER (PARTITION BY ls.language ORDER BY ls.avg_execution_time ASC) AS rn
        FROM language_stats ls
        JOIN "user" u ON ls.user_id = u.id
        WHERE ls.avg_execution_time IS NOT NULL
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn;
    `),

    db.query(`
      SELECT username, "displayUsername", language, test_cases_passed, rn
      FROM (
        SELECT u.username, u."displayUsername", ls.language,
               ls.test_cases_passed,
               ROW_NUMBER() OVER (PARTITION BY ls.language ORDER BY ls.test_cases_passed DESC) AS rn
        FROM language_stats ls
        JOIN "user" u ON ls.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn;
    `),
  ]);
};

// Helper to group rows by language
const groupByLanguage = (rows) => {
  return rows.reduce((acc, row) => {
    (acc[row.language] ??= []).push(row);
    return acc;
  }, {});
};

// Leaderboard router
const leaderboardRouter = () => {
  // Init the router
  const router = express.Router();

  // GET /api/leaderboard
  router.get("/", async (req, res) => {
    try {
      const [totalStatsResults, languageStatsResults] = await Promise.all([
        getTotalStats(),
        getAllLanguageStats(),
      ]);

      const [
        matches_won,
        matches_played,
        win_rate,
        avg_execution_time,
        avg_submission_time,
        total_submissions,
        passed_submissions,
      ] = totalStatsResults;

      // Group language stats by language
      const groupedLanguageStats = {
        total_submissions: groupByLanguage(languageStatsResults[0].rows),
        passed_submissions: groupByLanguage(languageStatsResults[1].rows),
        avg_execution_time: groupByLanguage(languageStatsResults[2].rows),
        avg_submission_time: groupByLanguage(languageStatsResults[3].rows),
        test_cases_passed: groupByLanguage(languageStatsResults[4].rows),
      };

      res.json({
        matches_won: matches_won.rows,
        matches_played: matches_played.rows,
        win_rate: win_rate.rows,
        total_submissions: total_submissions.rows,
        passed_submissions: passed_submissions.rows,
        avg_submission_time: avg_submission_time.rows,
        avg_execution_time: avg_execution_time.rows,
        languageStats: groupedLanguageStats,
      });
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  return router;
};

export default leaderboardRouter;
