// Imports
import express from "express";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import db from "../db.js";
import { buildMatchHistory } from "./matchHistory.js";

// Profile router
const profileRouter = () => {
  // Init the router
  const router = express.Router();

  // GET /api/profile
  router.get("/", async (req, res) => {
    try {
      const headers = fromNodeHeaders(req.headers);
      const session = await auth.api.getSession({ headers });

      if (!session?.user) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      const userId = session.user.id;

      let [matchStats, submissionStats, languageStats] = await Promise.all([
        db.query(
          `SELECT
             COUNT(*)::int AS matches_played,
             COUNT(*) FILTER (WHERE won)::int AS matches_won,
             (COUNT(*) FILTER (WHERE won))::float / NULLIF(COUNT(*), 0) AS win_rate
           FROM matches
           WHERE user_id = $1`,
          [userId],
        ),
        db.query(
          `SELECT
             COUNT(*)::int AS total_submissions,
             COUNT(*) FILTER (WHERE passed)::int AS passed_submissions,
             AVG(execution_time) AS avg_execution_time,
             AVG(submit_time) AS avg_submission_time,
             COALESCE(SUM(test_cases_passed), 0)::int AS test_cases_passed,
             (COUNT(*) FILTER (WHERE passed))::float / NULLIF(COUNT(*), 0) AS pass_rate
           FROM submissions
           WHERE user_id = $1`,
          [userId],
        ),
        db.query(
          `SELECT
             language,
             COUNT(*)::int AS total_submissions,
             COUNT(*) FILTER (WHERE passed)::int AS passed_submissions,
             AVG(execution_time) AS avg_execution_time,
             AVG(submit_time) AS avg_submission_time,
             COALESCE(SUM(test_cases_passed), 0)::int AS test_cases_passed,
             (COUNT(*) FILTER (WHERE passed))::float / NULLIF(COUNT(*), 0) AS pass_rate
           FROM submissions
           WHERE user_id = $1
           GROUP BY language`,
          [userId],
        ),
      ]);

      matchStats = matchStats.rows[0] ?? {
        matches_played: 0,
        matches_won: 0,
        win_rate: null,
      };
      submissionStats = submissionStats.rows[0] ?? {
        total_submissions: 0,
        passed_submissions: 0,
        avg_execution_time: null,
        avg_submission_time: null,
        test_cases_passed: 0,
        pass_rate: null,
      };
      languageStats = languageStats.rows;

      // Build recent match history for the user (limit 5, offset 0)
      const matches = await buildMatchHistory(userId, 5, 0);

      const profileInfo = {
        displayName: session.user.displayUsername ?? session.user.name,
        username: session.user.username,
        gameStats: {
          matches_played: matchStats.matches_played ?? 0,
          matches_won: matchStats.matches_won ?? 0,
          win_rate: matchStats.win_rate ?? "N/A",
          test_cases_passed: submissionStats.test_cases_passed ?? 0,
          avg_execution_time: submissionStats.avg_execution_time ?? "N/A",
          avg_submission_time: submissionStats.avg_submission_time ?? "N/A",
          total_submissions: submissionStats.total_submissions ?? 0,
          passed_submissions: submissionStats.passed_submissions ?? 0,
          pass_rate: submissionStats.pass_rate ?? "N/A",
          languageStats: languageStats.map((lang) => ({
            language: lang.language ?? "N/A",
            total_submissions: lang.total_submissions ?? 0,
            passed_submissions: lang.passed_submissions ?? 0,
            avg_execution_time: lang.avg_execution_time ?? "N/A",
            avg_submission_time: lang.avg_submission_time ?? "N/A",
            test_cases_passed: lang.test_cases_passed ?? 0,
            pass_rate: lang.pass_rate ?? "N/A",
          })),
        },
        matches,
      };

      return res.json(profileInfo);
    } catch (error) {
      console.error("Error fetching profile info:", error);
      return res.status(500).json({ message: "Failed to get profile info" });
    }
  });

  return router;
};

export default profileRouter;
