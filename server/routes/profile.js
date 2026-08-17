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
    try {
      const headers = fromNodeHeaders(req.headers);
      const session = await auth.api.getSession({ headers });

      if (!session?.user) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      const userId = session.user.id;

      let [matchStats, submissionStats, languageStats, recentMatches] =
        await Promise.all([
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
          // Initial 8 matches, most recent first
          db.query(
            `SELECT
             m.room_id,
             m.difficulty,
             m.won,
             m.played_at,
             COALESCE(h.username, h.name) AS host_name
           FROM matches m
           LEFT JOIN "user" h ON m.host_id = h.id
           WHERE m.user_id = $1
           ORDER BY m.played_at DESC
           LIMIT 8`,
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
      const matchRows = recentMatches.rows;
      const roomIds = matchRows.map((m) => m.room_id);

      // Fetch each user's own submissions + their eliminations for those rooms
      let [submissionsResult, eliminationsResult] = await Promise.all([
        roomIds.length
          ? db.query(
              `SELECT id, room_id, language, execution_time, submit_time, test_cases_passed, total_test_cases, round_number, submitted_at
             FROM submissions
             WHERE user_id = $1 AND room_id = ANY($2::text[])
             ORDER BY room_id, round_number ASC, submitted_at ASC`,
              [userId, roomIds],
            )
          : { rows: [] },
        roomIds.length
          ? db.query(
              `SELECT se.submission_id, se.eliminated_user_id,
                    COALESCE(u.username, u.name) AS eliminated_name
             FROM submission_eliminations se
             JOIN submissions s ON se.submission_id = s.id
             JOIN "user" u ON se.eliminated_user_id = u.id
             WHERE s.user_id = $1 AND s.room_id = ANY($2::text[])`,
              [userId, roomIds],
            )
          : { rows: [] },
      ]);

      // Group eliminations by submission_id
      const eliminationsBySubmission = {};
      for (const row of eliminationsResult.rows) {
        const name =
          row.eliminated_user_id === userId ? "YOU" : row.eliminated_name;
        (eliminationsBySubmission[row.submission_id] ??= []).push(name);
      }

      // Group submissions by room_id
      const submissionsByRoom = {};
      for (const row of submissionsResult.rows) {
        (submissionsByRoom[row.room_id] ??= []).push({
          id: row.id,
          language: row.language,
          executionTime: row.execution_time,
          submissionTime: row.submit_time,
          testCasesPassed: row.test_cases_passed,
          totalTestCases: row.total_test_cases,
          eliminated: eliminationsBySubmission[row.id] ?? [],
        });
      }

      const matches = matchRows.map((m) => ({
        id: m.room_id,
        won: m.won,
        host: m.host_name ?? "Unknown",
        difficulty: m.difficulty,
        date: m.played_at,
        submissions: submissionsByRoom[m.room_id] ?? [],
      }));

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
