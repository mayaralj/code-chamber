// Imports
import express from "express";
import db from "../db.js";

// Helper to query for all total stats (not language specific) for the leaderboard
const getTotalStats = () => {
  return Promise.all([
    // Matches won
    db.query(`
      SELECT u.username, u."displayUsername", agg.matches_won
      FROM (
        SELECT user_id, COUNT(*) FILTER (WHERE won)::int AS matches_won
        FROM matches
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY matches_won DESC LIMIT 10
    `),

    // Matches played
    db.query(`
      SELECT u.username, u."displayUsername", agg.matches_played
      FROM (
        SELECT user_id, COUNT(*)::int AS matches_played
        FROM matches
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY matches_played DESC LIMIT 10
    `),

    // Win rate (min 10 matches played to qualify)
    db.query(`
      SELECT u.username, u."displayUsername", agg.win_rate
      FROM (
        SELECT user_id,
               (COUNT(*) FILTER (WHERE won))::float / COUNT(*) AS win_rate
        FROM matches
        GROUP BY user_id
        HAVING COUNT(*) >= 10
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY win_rate DESC LIMIT 10
    `),

    // Avg execution time (fastest first)
    db.query(`
      SELECT u.username, u."displayUsername", agg.avg_execution_time
      FROM (
        SELECT user_id, AVG(execution_time) AS avg_execution_time
        FROM submissions
        WHERE execution_time IS NOT NULL
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY avg_execution_time ASC LIMIT 10
    `),

    // Avg submission time (fastest first)
    db.query(`
      SELECT u.username, u."displayUsername", agg.avg_submission_time
      FROM (
        SELECT user_id, AVG(submit_time) AS avg_submission_time
        FROM submissions
        WHERE submit_time IS NOT NULL
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY avg_submission_time ASC LIMIT 10
    `),

    // Total submissions
    db.query(`
      SELECT u.username, u."displayUsername", agg.total_submissions
      FROM (
        SELECT user_id, COUNT(*)::int AS total_submissions
        FROM submissions
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY total_submissions DESC LIMIT 10
    `),

    // Passed submissions
    db.query(`
      SELECT u.username, u."displayUsername", agg.passed_submissions
      FROM (
        SELECT user_id, COUNT(*) FILTER (WHERE passed)::int AS passed_submissions
        FROM submissions
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY passed_submissions DESC LIMIT 10
    `),

    // Pass rate
    db.query(`
      SELECT u.username, u."displayUsername", agg.pass_rate
      FROM (
        SELECT user_id,
               (COUNT(*) FILTER (WHERE passed))::float / COUNT(*) AS pass_rate
        FROM submissions
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY pass_rate DESC LIMIT 10
    `),

    // Test cases passed
    db.query(`
      SELECT u.username, u."displayUsername", agg.test_cases_passed
      FROM (
        SELECT user_id, COALESCE(SUM(test_cases_passed), 0)::int AS test_cases_passed
        FROM submissions
        GROUP BY user_id
      ) agg
      JOIN "user" u ON agg.user_id = u.id
      ORDER BY test_cases_passed DESC LIMIT 10
    `),
  ]);
};

// Helper to query for language stats for the leaderboard (top 10 per language)
const getAllLanguageStats = () => {
  return Promise.all([
    // Total submissions per language
    db.query(`
      SELECT username, "displayUsername", language, total_submissions, rn
      FROM (
        SELECT u.username, u."displayUsername", agg.language, agg.total_submissions,
               ROW_NUMBER() OVER (PARTITION BY agg.language ORDER BY agg.total_submissions DESC) AS rn
        FROM (
          SELECT user_id, language, COUNT(*)::int AS total_submissions
          FROM submissions
          GROUP BY user_id, language
        ) agg
        JOIN "user" u ON agg.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn
    `),

    // Passed submissions per language
    db.query(`
      SELECT username, "displayUsername", language, passed_submissions, rn
      FROM (
        SELECT u.username, u."displayUsername", agg.language, agg.passed_submissions,
               ROW_NUMBER() OVER (PARTITION BY agg.language ORDER BY agg.passed_submissions DESC) AS rn
        FROM (
          SELECT user_id, language, COUNT(*) FILTER (WHERE passed)::int AS passed_submissions
          FROM submissions
          GROUP BY user_id, language
        ) agg
        JOIN "user" u ON agg.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn
    `),

    // Pass rate per language
    db.query(`
      SELECT username, "displayUsername", language, pass_rate, rn
      FROM (
        SELECT u.username, u."displayUsername", agg.language, agg.pass_rate,
               ROW_NUMBER() OVER (PARTITION BY agg.language ORDER BY agg.pass_rate DESC) AS rn
        FROM (
          SELECT user_id, language,
                 (COUNT(*) FILTER (WHERE passed))::float / COUNT(*) AS pass_rate
          FROM submissions
          GROUP BY user_id, language
        ) agg
        JOIN "user" u ON agg.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn
    `),

    // Avg execution time per language
    db.query(`
      SELECT username, "displayUsername", language, avg_execution_time, rn
      FROM (
        SELECT u.username, u."displayUsername", agg.language, agg.avg_execution_time,
               ROW_NUMBER() OVER (PARTITION BY agg.language ORDER BY agg.avg_execution_time ASC) AS rn
        FROM (
          SELECT user_id, language, AVG(execution_time) AS avg_execution_time
          FROM submissions
          WHERE execution_time IS NOT NULL
          GROUP BY user_id, language
        ) agg
        JOIN "user" u ON agg.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn
    `),

    // Avg submission time per language
    db.query(`
      SELECT username, "displayUsername", language, avg_submission_time, rn
      FROM (
        SELECT u.username, u."displayUsername", agg.language, agg.avg_submission_time,
               ROW_NUMBER() OVER (PARTITION BY agg.language ORDER BY agg.avg_submission_time ASC) AS rn
        FROM (
          SELECT user_id, language, AVG(submit_time) AS avg_submission_time
          FROM submissions
          WHERE submit_time IS NOT NULL
          GROUP BY user_id, language
        ) agg
        JOIN "user" u ON agg.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn
    `),

    // Test cases passed per language
    db.query(`
      SELECT username, "displayUsername", language, test_cases_passed, rn
      FROM (
        SELECT u.username, u."displayUsername", agg.language, agg.test_cases_passed,
               ROW_NUMBER() OVER (PARTITION BY agg.language ORDER BY agg.test_cases_passed DESC) AS rn
        FROM (
          SELECT user_id, language, COALESCE(SUM(test_cases_passed), 0)::int AS test_cases_passed
          FROM submissions
          GROUP BY user_id, language
        ) agg
        JOIN "user" u ON agg.user_id = u.id
      ) ranked
      WHERE rn <= 10
      ORDER BY language, rn
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
        pass_rate,
        test_cases_passed,
      ] = totalStatsResults;

      // Group language stats by language
      const groupedLanguageStats = {
        total_submissions: groupByLanguage(languageStatsResults[0].rows),
        passed_submissions: groupByLanguage(languageStatsResults[1].rows),
        pass_rate: groupByLanguage(languageStatsResults[2].rows),
        avg_execution_time: groupByLanguage(languageStatsResults[3].rows),
        avg_submission_time: groupByLanguage(languageStatsResults[4].rows),
        test_cases_passed: groupByLanguage(languageStatsResults[5].rows),
      };

      res.json({
        matches_won: matches_won.rows,
        matches_played: matches_played.rows,
        win_rate: win_rate.rows,
        total_submissions: total_submissions.rows,
        passed_submissions: passed_submissions.rows,
        pass_rate: pass_rate.rows,
        avg_submission_time: avg_submission_time.rows,
        avg_execution_time: avg_execution_time.rows,
        test_cases_passed: test_cases_passed.rows,
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
