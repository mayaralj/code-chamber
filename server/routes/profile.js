// Imports
import express from "express";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import db from "../db.js";

const profileRouter = () => {
  // Init the router
  const router = express.Router();

  // GET /api/profile
  router.get("/", async (req, res) => {
    // Send back the profile info as JSON
    try {
      const headers = fromNodeHeaders(req.headers);
      // Get the session from the auth client
      const session = await auth.api.getSession({ headers });
      // If no session, return 401 Unauthorized
      if (!session?.user) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      // Place both in promise.all to run in parallel
      let [profileStats, languageStats] = await Promise.all([
        db.query(
          `SELECT
       matches_played,
       matches_won,
       test_cases_passed,
       avg_execution_time,
       avg_submission_time,
       total_submissions,
       passed_submissions,
       (matches_won::float / NULLIF(matches_played, 0)) AS win_rate,
       (passed_submissions::float / NULLIF(total_submissions, 0)) AS pass_rate
     FROM profile_stats
     WHERE user_id = $1`,
          [session.user.id],
        ),
        db.query(
          `SELECT
       language,
       total_submissions,
       passed_submissions,
       avg_execution_time,
       avg_submission_time,
       test_cases_passed,
       (passed_submissions::float / NULLIF(total_submissions, 0)) AS pass_rate
     FROM language_stats
     WHERE user_id = $1`,
          [session.user.id],
        ),
      ]);

      profileStats = profileStats.rows[0] ?? {
        matches_played: 0,
        matches_won: 0,
        test_cases_passed: 0,
        avg_execution_time: null,
        avg_submission_time: null,
        total_submissions: 0,
        passed_submissions: 0,
        win_rate: null,
        pass_rate: null,
      };
      languageStats = languageStats.rows;

      const profileInfo = {
        displayName: session.user.displayUsername ?? session.user.name,
        username: session.user.username,
        gameStats: {
          matches_played: profileStats.matches_played ?? 0,
          matches_won: profileStats.matches_won ?? 0,
          test_cases_passed: profileStats.test_cases_passed ?? 0,
          avg_execution_time: profileStats.avg_execution_time ?? "N/A",
          avg_submission_time: profileStats.avg_submission_time ?? "N/A",
          total_submissions: profileStats.total_submissions ?? 0,
          passed_submissions: profileStats.passed_submissions ?? 0,
          win_rate: profileStats.win_rate ?? "N/A",
          pass_rate: profileStats.pass_rate ?? "N/A",
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
      };
      console.log("Profile info fetched for user:", profileInfo);
      return res.json(profileInfo);
    } catch (error) {
      console.error("Error fetching profile info:", error);
      return res.status(500).json({ message: "Failed to get profile info" });
    }
  });

  // Return the router
  return router;
};

// Export the router
export default profileRouter;
