// Imports
import { useState, useEffect, useCallback, useRef } from "react";

// Config
const FETCH_INTERVAL = 60 * 1000;

// Metrics available when viewing "ALL" (overall, cross-language stats)
const overallMetrics = {
  matches_won: { label: "Matches Won", field: "matches_won", format: (v) => v },
  matches_played: {
    label: "Matches Played",
    field: "matches_played",
    format: (v) => v,
  },
  win_rate: {
    label: "Win Rate",
    field: "win_rate",
    format: (v) => `${(v * 100).toFixed(2)}%`,
  },
  total_submissions: {
    label: "Total Submissions",
    field: "total_submissions",
    format: (v) => v,
  },
  passed_submissions: {
    label: "Passed Submissions",
    field: "passed_submissions",
    format: (v) => v,
  },
  pass_rate: {
    label: "Pass Rate",
    field: "pass_rate",
    format: (v) => `${(v * 100).toFixed(2)}%`,
  },
  avg_submission_time: {
    label: "Avg Submission Time (s)",
    field: "avg_submission_time",
    format: (v) => v.toFixed(2),
  },
  avg_execution_time: {
    label: "Avg Execution Time (ms)",
    field: "avg_execution_time",
    format: (v) => v.toFixed(2),
  },
  test_cases_passed: {
    label: "Test Cases Passed",
    field: "test_cases_passed",
    format: (v) => v,
  },
};

// Metrics available when a specific language is selected (no match related info for languages)
const languageMetrics = {
  total_submissions: {
    label: "Total Submissions",
    field: "total_submissions",
    format: (v) => v,
  },
  passed_submissions: {
    label: "Passed Submissions",
    field: "passed_submissions",
    format: (v) => v,
  },
  pass_rate: {
    label: "Pass Rate",
    field: "pass_rate",
    format: (v) => `${(v * 100).toFixed(2)}%`,
  },
  avg_submission_time: {
    label: "Avg Submission Time (s)",
    field: "avg_submission_time",
    format: (v) => v.toFixed(2),
  },
  avg_execution_time: {
    label: "Avg Execution Time (ms)",
    field: "avg_execution_time",
    format: (v) => v.toFixed(2),
  },
  test_cases_passed: {
    label: "Test Cases Passed",
    field: "test_cases_passed",
    format: (v) => v,
  },
};

// Language options for the leaderboard filter
const languageOptions = {
  ALL: "ALL",
  cpp: "C++",
  javascript: "JavaScript",
  python: "Python",
};

// Leaderboard.jsx
const Leaderboard = () => {
  // States
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fetchStatus, setFetchStatus] = useState("loading");
  const [language, setLanguage] = useState("ALL");
  const [metric, setMetric] = useState("matches_won");
  const [difficulty, setDifficulty] = useState("ALL");

  // Refs
  const abortController = useRef(null);

  // Fetch leaderboard data from the server
  const fetchLeaderboardData = useCallback(async () => {
    // Abort any ongoing fetch
    abortController.current?.abort();

    // Create a new abort controller for this fetch
    abortController.current = new AbortController();
    try {
      const response = await fetch(`/api/leaderboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        signal: abortController.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      // Set Data
      const data = await response.json();
      setLeaderboardData(data);
      setFetchStatus("success");
      setErrorMessage("");
    } catch (error) {
      // ignore abort errors
      if (error.name === "AbortError") {
        console.log("Leaderboard fetch aborted");
        return;
      }
      console.error("Error fetching leaderboard data:", error);
      setFetchStatus("error");
      setErrorMessage("Could not load leaderboard data.");
    }
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    // Initial fetch
    fetchLeaderboardData();

    // Fetch on an interval
    const interval = setInterval(() => {
      fetchLeaderboardData();
    }, FETCH_INTERVAL);

    // Cleanup
    return () => {
      // Abort any ongoing fetch when the component unmounts
      abortController.current?.abort();
      // Clear the interval when the component unmounts
      clearInterval(interval);
    };
  }, [fetchLeaderboardData, abortController]);

  // helper to handle retry profile fetch
  const refetchLeaderboardData = () => {
    setFetchStatus("fetching");
    fetchLeaderboardData();
  };

  // If profile info fetch error'd out, show an error message with a retry button
  if (fetchStatus === "error") {
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] px-4 font-mono text-[#e7c49d]">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ffd89a]/40 bg-[#ffd89a]/5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-6 w-6 text-[#ffd89a]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.007M12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z"
              />
            </svg>
          </div>

          <p className="text-sm font-bold uppercase tracking-wide text-[#ffd89a]">
            Couldn't load leaderboard
          </p>
          <p className="text-xs text-[#e7c49d]/70">
            Something went wrong while fetching the leaderboard. Please wait and
            try again.
          </p>

          <button
            type="button"
            onClick={refetchLeaderboardData}
            className="mt-2 cursor-pointer rounded border border-[#ffd89a] px-5 py-2 font-mono text-sm font-bold text-[#ffd89a] transition-colors duration-150 hover:bg-[#ffd89a] hover:text-[#241d14] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd89a]/60"
          >
            RETRY
          </button>
        </div>
      </main>
    );
  } else if (fetchStatus === "fetching" && !leaderboardData) {
    // If profile info is still being fetched, show a loading state
    return (
      <main className="min-h-[calc(100vh-72px)] grid place-items-center bg-[#0b0b0b] font-mono text-[#e7c49d]">
        LOADING LEADERBOARD...
      </main>
    );
  }

  // get the appropriate metrics and config based on the selected language
  const metricsForScope = language === "ALL" ? overallMetrics : languageMetrics;
  const config = metricsForScope[metric];

  // Helper to handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    const nextMetrics =
      newLanguage === "ALL" ? overallMetrics : languageMetrics;
    if (!nextMetrics[metric]) {
      setMetric(Object.keys(nextMetrics)[0]);
    }
  };

  // Get the rows to display based on the selected language and metric
  const rows = leaderboardData?.[language]?.[difficulty]?.[metric] ?? [];

  // Render
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#0b0b0b] px-6 py-10 font-mono text-[#e7c49d]">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-8 text-center text-5xl font-bold text-[#ffdd9d] tracking-[0.12em]">
          LEADERBOARDS
        </h1>
        <p className="mb-8 text-center text-sm font-bold tracking-[0.10em] text-[#c7b499]">
          VIEW THE TOP CODERS AND THEIR STATS ACROSS DIFFERENT LANGUAGES AND
          METRICS.
        </p>

        {errorMessage && (
          <p className="mb-6 text-center text-sm font-bold text-[#ffd89a]">
            {errorMessage}
          </p>
        )}

        {/* Filter bar */}
        <div
          className={`${fetchStatus === "fetching" ? "mb-3" : "mb-6"} flex flex-col gap-4 rounded border border-[#4b4133] bg-[#0f0f0f] p-5 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="language-select"
              className="text-xs font-bold uppercase tracking-wide text-[#c7b499]"
            >
              Language
            </label>
            <select
              id="language-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="cursor-pointer rounded border border-[#4b4133] bg-[#0b0b0b] px-3 py-1.5 text-sm text-[#e7c49d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd89a]/60"
            >
              {/* Iterate over language options and set the value as the visible but key as the index */}
              {Object.entries(languageOptions).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="difficulty-select"
              className="text-xs font-bold uppercase tracking-wide text-[#c7b499]"
            >
              Difficulty
            </label>
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="cursor-pointer rounded border border-[#4b4133] bg-[#0b0b0b] px-3 py-1.5 text-sm text-[#e7c49d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd89a]/60"
            >
              <option value="ALL">ALL</option>
              <option value="easy">EASY</option>
              <option value="medium">MEDIUM</option>
              <option value="hard">HARD</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="metric-select"
              className="text-xs font-bold uppercase tracking-wide text-[#c7b499]"
            >
              Metric
            </label>
            <select
              id="metric-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="cursor-pointer rounded border border-[#4b4133] bg-[#0b0b0b] px-3 py-1.5 text-sm text-[#e7c49d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd89a]/60"
            >
              {Object.entries(metricsForScope).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* If data exists but is fetching show a loading indicator */}
        {leaderboardData && fetchStatus === "fetching" && (
          <div className="mb-3 flex items-center justify-center text-sm text-[#ffd89a]">
            <svg
              className="h-4 w-4 animate-spin text-[#ffd89a]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="uppercase tracking-wide">
              Updating leaderboard...
            </span>
          </div>
        )}

        {/* Results */}
        <div
          className={`overflow-x-auto rounded border border-[#4b4133] bg-[#0f0f0f]  ${
            fetchStatus === "fetching" ? "opacity-50" : "opacity-100"
          }`}
        >
          {" "}
          <table className="w-full table-fixed text-left text-sm text-[#e7c49d]">
            <colgroup>
              <col className="w-14" />
              <col className="w-1/2" />
              <col />
            </colgroup>
            <thead>
              <tr className="border-b border-[#4b4133] text-xs uppercase tracking-wide text-[#c7b499]">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-center">{config.label}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-[#e7c49d]/50"
                  >
                    No one is here yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.username}
                    className="border-b border-[#2a2419]/60 last:border-none"
                  >
                    <td className="px-4 py-3 text-[#e7c49d]/50">{index + 1}</td>
                    <td className="truncate px-4 py-3 font-bold text-[#ffd89a]">
                      {row.displayUsername ?? row.username}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {config.format(row[config.field])}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default Leaderboard;
