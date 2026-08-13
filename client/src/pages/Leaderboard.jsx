// Imports
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

// Bunch of placeholder info until backend is ready

const players = [
  "kaidenv",
  "lunaray",
  "zephyr_x",
  "devanshr",
  "mira_tan",
  "oakleyq",
  "vantris",
  "nyx_code",
];

const languages = ["Python", "JavaScript", "C++"];
const seededRandom = (seed) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

const buildScopeStats = (seed) => {
  const rand = seededRandom(seed);
  return players.map((username) => ({
    username,
    matches_played: Math.floor(60 + rand() * 120),
    matches_won: Math.floor(20 + rand() * 90),
    total_submissions: Math.floor(150 + rand() * 400),
    submissions_passed: Math.floor(100 + rand() * 350),
    avg_submit_time: +(3 + rand() * 5).toFixed(2),
    avg_execution_time: +(0.05 + rand() * 0.35).toFixed(2),
    test_cases_passed: Math.floor(400 + rand() * 3000),
  }));
};

const overallStats = buildScopeStats(1).map((row) => ({
  ...row,
  win_rate: +(row.matches_won / row.matches_played).toFixed(2),
}));

const languageStats = languages.reduce((acc, lang, index) => {
  acc[lang] = buildScopeStats(index + 2);
  return acc;
}, {});

const overallMetrics = {
  matches_won: { label: "Matches Won", decimals: 0, direction: "desc" },
  matches_played: { label: "Matches Played", decimals: 0, direction: "desc" },
  win_rate: {
    label: "Win Rate",
    unit: "%",
    decimals: 0,
    direction: "desc",
    multiplier: 100,
  },
  total_submissions: {
    label: "Total Submissions",
    decimals: 0,
    direction: "desc",
  },
  submissions_passed: {
    label: "Submissions Passed",
    decimals: 0,
    direction: "desc",
  },
  avg_submit_time: {
    label: "Avg Submit Time",
    unit: "s",
    decimals: 2,
    direction: "asc",
  },
  avg_execution_time: {
    label: "Avg Execution Time",
    unit: "s",
    decimals: 2,
    direction: "asc",
  },
  test_cases_passed: {
    label: "Test Cases Passed",
    decimals: 0,
    direction: "desc",
  },
};

const languageMetrics = {
  total_submissions: {
    label: "Total Submissions",
    decimals: 0,
    direction: "desc",
  },
  submissions_passed: {
    label: "Submissions Passed",
    decimals: 0,
    direction: "desc",
  },
  avg_submit_time: {
    label: "Avg Submit Time",
    unit: "s",
    decimals: 2,
    direction: "asc",
  },
  avg_execution_time: {
    label: "Avg Execution Time",
    unit: "s",
    decimals: 2,
    direction: "asc",
  },
  test_cases_passed: {
    label: "Test Cases Passed",
    decimals: 0,
    direction: "desc",
  },
};

const scopeOptions = ["ALL", ...languages];
const MAX_PLACEMENTS = 10;

// Leaderboard.jsx
const Leaderboard = () => {
  // Navigate
  const navigate = useNavigate();

  // States
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [fetchStatus, setFetchStatus] = useState("loading");

  // Filter state for placeholder-driven view
  const [scope, setScope] = useState("ALL");
  const [metric, setMetric] = useState("matches_won");

  // Fetch profile info on mount
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
        setFetchStatus("success");

        if (!cancelled) {
          setLeaderboardData(data);
        }
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setFetchStatus("error");

        if (!cancelled) {
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

  const metricsForScope = scope === "ALL" ? overallMetrics : languageMetrics;
  const dataForScope = scope === "ALL" ? overallStats : languageStats[scope];

  const handleScopeChange = (nextScope) => {
    setScope(nextScope);
    const nextMetrics = nextScope === "ALL" ? overallMetrics : languageMetrics;
    if (!nextMetrics[metric]) {
      setMetric(Object.keys(nextMetrics)[0]);
    }
  };

  const config = metricsForScope[metric];

  const sortedRows = [...dataForScope]
    .sort((a, b) =>
      config.direction === "asc"
        ? a[metric] - b[metric]
        : b[metric] - a[metric],
    )
    .slice(0, Math.min(MAX_PLACEMENTS, dataForScope.length));

  const formatValue = (row) => {
    const raw = config.multiplier
      ? row[metric] * config.multiplier
      : row[metric];
    return `${raw.toFixed(config.decimals)}${config.unit ?? ""}`;
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#0b0b0b] px-6 py-10 font-mono text-[#e7c49d]">
      <div className="mx-auto max-w-2xl">
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
              htmlFor="scope-select"
              className="text-xs font-bold uppercase tracking-wide text-[#c7b499]"
            >
              Language
            </label>
            <select
              id="scope-select"
              value={scope}
              onChange={(e) => handleScopeChange(e.target.value)}
              className="cursor-pointer rounded border border-[#4b4133] bg-[#0b0b0b] px-3 py-1.5 text-sm text-[#e7c49d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd89a]/60"
            >
              {scopeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
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
              {sortedRows.map((row, index) => (
                <tr
                  key={row.username}
                  className="border-b border-[#2a2419]/60 last:border-none"
                >
                  <td className="px-4 py-3 text-[#e7c49d]/50">{index + 1}</td>
                  <td className="truncate px-4 py-3 font-bold text-[#ffd89a]">
                    {row.username}
                  </td>
                  <td className="px-4 py-3 text-center">{formatValue(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default Leaderboard;
