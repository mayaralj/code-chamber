// Imports
import db from "../db.js";

// Config
const COMPUTE_INTERVAL = 60 * 1000;
let computeTimer = null;
// export so route can easily access it
export let leaderboardData = null;

// Available languages and difficulties for leaderboard
const LANGUAGES = ["ALL", "cpp", "javascript", "python"];
const DIFFICULTIES = ["ALL", "easy", "medium", "hard"];

// Computes all metrics for a single combo
const getStatsForScope = async (language, difficulty) => {
  // Matches cant have language included since matches arent language specific, so only include difficulty filter for matches
  const includeMatches = language === "ALL";

  // Build submissions WHERE clause (supports both filters)
  const subFilters = [];
  const subParams = [];
  if (language !== "ALL") {
    subParams.push(language);
    subFilters.push(`language = $${subParams.length}`);
  }
  if (difficulty !== "ALL") {
    subParams.push(difficulty);
    subFilters.push(`difficulty = $${subParams.length}`);
  }
  const subWhere = subFilters.length ? `WHERE ${subFilters.join(" AND ")}` : "";

  // Build matches WHERE clause (difficulty only)
  const matchParams = [];
  let matchWhere = "";
  if (includeMatches && difficulty !== "ALL") {
    matchParams.push(difficulty);
    matchWhere = `WHERE difficulty = $1`;
  }

  // Build queries for all metrics
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

  // If matches are included
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

  // Execute all queries and return results
  const keys = Object.keys(queries);
  const results = await Promise.all(Object.values(queries));
  const scopeResult = {};
  keys.forEach((key, i) => {
    scopeResult[key] = results[i].rows;
  });
  return scopeResult;
};

// Computes and nests every language x difficulty combination
const buildLeaderboardData = async () => {
  const result = {};

  // Compute all combinations of languages and difficulties in parallel
  await Promise.all(
    LANGUAGES.map(async (language) => {
      result[language] = {};
      await Promise.all(
        DIFFICULTIES.map(async (difficulty) => {
          result[language][difficulty] = await getStatsForScope(
            language,
            difficulty,
          );
        }),
      );
    }),
  );

  return result;
};

// Helper to start the leaderboard compute interval
export const startLeaderboardCompute = () => {
  // Check if already running
  if (computeTimer) return;

  console.log("Starting leaderboard precomputation...");

  // Warm the cache immediately so the first request isn't empty
  buildLeaderboardData()
    .then((data) => {
      leaderboardData = data;
    })
    .catch((err) => console.error("Initial leaderboard build failed:", err));

  // Start running on an interval
  computeTimer = setInterval(async () => {
    try {
      leaderboardData = await buildLeaderboardData();
    } catch (err) {
      console.error("Leaderboard compute failed:", err);
      // dont update leaderboardData if there's an error, keep the last good data
    }
  }, COMPUTE_INTERVAL);
};

// Helper to stop the leaderboard compute interval
export const stopLeaderboardCompute = () => {
  clearInterval(computeTimer);
  computeTimer = null;
};
