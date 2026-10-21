// Imports
import db from "../db.js";

// Config
const REFRESH_INTERVAL = 60 * 1000;
let computeTimer = null;
let refreshQueued = false;
let refreshInProgress = false;
// export so route can easily access it
export let liveStats = null;

// Helper to build live stats data
const buildLiveStatsData = async () => {
  const [
    submissionAggregates,
    matchAggregates,
    languageUsage,
    difficultyUsage,
  ] = await Promise.all([
    // Overall submission-level stats
    db.query(
      `SELECT
           COUNT(*)::int AS total_submissions,
           (COUNT(*) FILTER (WHERE passed))::float / NULLIF(COUNT(*), 0) AS avg_pass_rate,
           AVG(execution_time) AS avg_execution_time,
           AVG(submit_time) AS avg_submission_time
         FROM submissions`,
    ),
    // Overall match-level stats
    db.query(
      `SELECT
           COUNT(DISTINCT room_id)::int AS total_matches,
           AVG(survival_time) AS avg_survival_time,
           AVG(survival_time) FILTER (WHERE won) AS avg_match_time
         FROM matches`,
    ),
    // Language usage, most and least used
    db.query(
      `SELECT language, COUNT(*)::int AS count
         FROM submissions
         GROUP BY language
         ORDER BY count DESC`,
    ),
    // Difficulty usage
    db.query(
      `SELECT difficulty, COUNT(DISTINCT room_id)::int AS count
         FROM matches
         GROUP BY difficulty
         ORDER BY count DESC`,
    ),
  ]);

  const submissionStats = submissionAggregates.rows[0] ?? {
    total_submissions: 0,
    avg_pass_rate: null,
    avg_execution_time: null,
    avg_submission_time: null,
  };

  const matchStats = matchAggregates.rows[0] ?? {
    total_matches: 0,
    avg_survival_time: null,
    avg_match_time: null,
  };

  const languageRows = languageUsage.rows;
  const difficultyRows = difficultyUsage.rows;

  return {
    total_matches: matchStats.total_matches ?? 0,
    total_submissions: submissionStats.total_submissions ?? 0,
    avg_pass_rate: submissionStats.avg_pass_rate ?? "N/A",
    avg_execution_time: submissionStats.avg_execution_time ?? "N/A",
    avg_submission_time: submissionStats.avg_submission_time ?? "N/A",
    most_used_language: languageRows[0]?.language ?? "N/A",
    least_used_language:
      languageRows[languageRows.length - 1]?.language ?? "N/A",
    most_used_difficulty: difficultyRows[0]?.difficulty ?? "N/A",
    least_used_difficulty:
      difficultyRows[difficultyRows.length - 1]?.difficulty ?? "N/A",
    avg_survival_time: matchStats.avg_survival_time ?? "N/A",
    avg_match_time: matchStats.avg_match_time ?? "N/A",
    computed_at: new Date().toISOString(),
  };
};

// Queue a refresh for the next scheduled refresh check
export const queueLiveStats = () => {
  refreshQueued = true;
};

const refreshLiveStatsIfQueued = async () => {
  if (!refreshQueued || refreshInProgress) return;

  refreshQueued = false;
  refreshInProgress = true;

  try {
    liveStats = await buildLiveStatsData();
  } catch (err) {
    console.error("Live stats compute failed:", err);
    // Retry on the next scheduled check, keeping the last good data meanwhile
    refreshQueued = true;
  } finally {
    refreshInProgress = false;
  }
};

// Helper to start the live stats refresh interval
export const startLiveStatsCompute = () => {
  // Check if already running
  if (computeTimer) return;

  console.log("Starting live stats precomputation...");

  // Queue one initial build so the first request isn't empty
  queueLiveStats();
  void refreshLiveStatsIfQueued();

  // Check periodically, but only query when a caller has queued a refresh
  computeTimer = setInterval(() => {
    void refreshLiveStatsIfQueued();
  }, REFRESH_INTERVAL);
};

// Helper to stop the leaderboard compute interval
export const stopLiveStatsCompute = () => {
  clearInterval(computeTimer);
  computeTimer = null;
};
