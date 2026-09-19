// Imports
import express from "express";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import db from "../db.js";

// Config
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 25;

// Small helper to average only over non-null/non-undefined numeric values
export const average = (values) => {
  const validValues = values.filter(
    (value) => value !== null && value !== undefined,
  );
  if (!validValues.length) return "N/A";
  const sum = validValues.reduce((total, value) => total + value, 0);
  return sum / validValues.length;
};

// Helper to aggregate a match's own submissions into per-match summary stats
export const buildMatchSummary = (submissions) => {
  if (!submissions.length) {
    return {
      total_rounds: 0,
      test_cases_passed: 0,
      total_test_cases: 0,
      avg_execution_time: "N/A",
      avg_submission_time: "N/A",
    };
  }

  const testCasesPassed = submissions.reduce(
    (total, sub) => total + (sub.testCasesPassed ?? 0),
    0,
  );
  const totalTestCases = submissions.reduce(
    (total, sub) => total + (sub.totalTestCases ?? 0),
    0,
  );

  return {
    total_rounds: submissions.length,
    test_cases_passed: testCasesPassed,
    total_test_cases: totalTestCases,
    avg_execution_time: average(submissions.map((sub) => sub.executionTime)),
    avg_submission_time: average(submissions.map((sub) => sub.submissionTime)),
  };
};

export const getMatchResults = async (userId, limit, offset) => {
  // Fetch this page of matches, most recent first
  const matchesResult = await db.query(
    `SELECT
       m.room_id,
       m.difficulty,
        m.won,
        m.played_at,
        m.survival_time,
        CASE WHEN m.host_is_guest THEN 'guest' ELSE h.username END AS host_username,
        CASE WHEN m.host_is_guest THEN 'Guest' ELSE h.name END AS host_display_name
      FROM matches m
      LEFT JOIN "user" h ON m.host_id = h.id
      WHERE m.user_id = $1
      ORDER BY m.played_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return matchesResult.rows;
};

export const getSubmissionResults = async (userId, roomIds) => {
  const submissionsResult = await db.query(
    `SELECT id, room_id, language, execution_time, submit_time, test_cases_passed, total_test_cases, round_number, submitted_at
     FROM submissions
     WHERE user_id = $1 AND room_id = ANY($2::text[])
     ORDER BY room_id, round_number ASC, submitted_at ASC`,
    [userId, roomIds],
  );
  return submissionsResult.rows;
};

export const getEliminationResults = async (userId, roomIds) => {
  const eliminationsResult = await db.query(
    `SELECT se.submission_id, se.eliminated_user_id,
      CASE WHEN se.eliminated_user_id LIKE 'guest%' THEN 'guest' ELSE u.username END AS eliminated_username,
      CASE WHEN se.eliminated_user_id LIKE 'guest%' THEN 'Guest' ELSE u.name END AS eliminated_display_name
     FROM submission_eliminations se
     JOIN submissions s ON se.submission_id = s.id  
    LEFT JOIN "user" u ON se.eliminated_user_id = u.id
      WHERE s.user_id = $1 AND s.room_id = ANY($2::text[])`,
    [userId, roomIds],
  );
  return eliminationsResult.rows;
};

export const buildMatchHistory = async (userId, limit, offset) => {
  // Fetch this page of matches, most recent first
  const matchResults = await getMatchResults(userId, limit, offset);
  const roomIds = matchResults.map((m) => m.room_id);

  // Fetch each user's own submissions + their eliminations for those rooms
  const [submissionResults, eliminationResults] = await Promise.all([
    roomIds.length ? getSubmissionResults(userId, roomIds) : { rows: [] },
    roomIds.length ? getEliminationResults(userId, roomIds) : { rows: [] },
  ]);

  // Group eliminations by submission_id
  const eliminationsBySubmission = {};
  for (const row of eliminationResults) {
    const isYou = row.eliminated_user_id === userId;
    const eliminated = {
      username: row.eliminated_username ?? null,
      displayName: isYou
        ? "YOU"
        : (row.eliminated_display_name ??
          row.eliminated_username ??
          "Deleted User"),
    };
    (eliminationsBySubmission[row.submission_id] ??= []).push(eliminated);
  }

  // Group submissions by room_id
  const submissionsByRoom = {};
  for (const row of submissionResults) {
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

  const matches = matchResults.map((m) => {
    const matchSubmissions = submissionsByRoom[m.room_id] ?? [];
    const summary = buildMatchSummary(matchSubmissions);

    return {
      id: m.room_id,
      won: m.won,
      host: {
        username: m.host_username ?? null,
        displayName: m.host_display_name ?? m.host_username ?? "Deleted User",
      },
      difficulty: m.difficulty,
      date: m.played_at,
      survivalTime: m.survival_time,
      totalRounds: summary.total_rounds,
      testCasesPassed: summary.test_cases_passed,
      totalTestCases: summary.total_test_cases,
      avgExecutionTime: summary.avg_execution_time,
      avgSubmissionTime: summary.avg_submission_time,
      submissions: matchSubmissions,
    };
  });
  return matches;
};

const matchHistoryRouter = () => {
  const router = express.Router();

  // GET /api/matchHistory?limit=5&offset=0
  router.get("/", async (req, res) => {
    try {
      const headers = fromNodeHeaders(req.headers);
      const session = await auth.api.getSession({ headers });

      if (!session?.user) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      const userId = session.user.id;

      // Parse + clamp pagination params so callers can't request huge pages
      const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      );
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

      // Fetch the match history for the user
      const matches = await buildMatchHistory(userId, limit, offset);

      // Return the match history as JSON
      return res.status(200).json(matches);
    } catch (error) {
      console.error("Error fetching match history:", error);
      return res.status(500).json({ message: "Failed to get match history" });
    }
  });

  return router;
};

export default matchHistoryRouter;
