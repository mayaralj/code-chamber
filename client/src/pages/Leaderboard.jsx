// Imports
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

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
    format: (v) => `${(Number(v) * 100).toFixed(2)}%`,
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
    format: (v) => `${(Number(v) * 100).toFixed(2)}%`,
  },
  avg_submission_time: {
    label: "Avg Submission Time (s)",
    field: "avg_submission_time",
    format: (v) => Number(v).toFixed(2),
  },
  avg_execution_time: {
    label: "Avg Execution Time (ms)",
    field: "avg_execution_time",
    format: (v) => Number(v).toFixed(2),
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
    format: (v) => `${(Number(v) * 100).toFixed(2)}%`,
  },
  avg_submission_time: {
    label: "Avg Submission Time (s)",
    field: "avg_submission_time",
    format: (v) => Number(v).toFixed(2),
  },
  avg_execution_time: {
    label: "Avg Execution Time (ms)",
    field: "avg_execution_time",
    format: (v) => Number(v).toFixed(2),
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
  // Navigate
  const navigate = useNavigate();

  // States
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fetchStatus, setFetchStatus] = useState("loading");

  // Filter state
  const [language, setLanguage] = useState("ALL");
  const [metric, setMetric] = useState("matches_won");

  // Fetch leaderboard data on mount
  useEffect(() => {
    let cancelled = false;

    const fetchLeaderboardData = async () => {
      setFetchStatus("loading");
      try {
        const response = await fetch("/api/leaderboard", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (response.status === 401) {
          navigate("/", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setLeaderboardData(data);
          setFetchStatus("success");
        }
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);

        if (!cancelled) {
          setFetchStatus("error");
          setErrorMessage("Could not load leaderboard data.");
        }
      }
    };

    fetchLeaderboardData();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // If leaderboard data is not yet loaded, show a loading state
  if (fetchStatus === "loading") {
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
  const rows =
    language === "ALL"
      ? leaderboardData?.[metric]
      : leaderboardData?.languageStats?.[metric]?.[language];

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
        <div className="mb-8 flex flex-col gap-4 rounded border border-[#4b4133] bg-[#0f0f0f] p-5 sm:flex-row sm:items-end sm:justify-between">
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

        {/* Results */}
        <div className="overflow-x-auto rounded border border-[#4b4133] bg-[#0f0f0f]">
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
