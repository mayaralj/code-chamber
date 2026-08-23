// Imports
import { useNavigate } from "react-router";
import { useState, useEffect } from "react";

// Bunch of helpers to format live stats numbers for display
const formatPercent = (value) =>
  value === "N/A" || value === null || value === undefined
    ? "N/A"
    : `${Math.round(value * 100)}%`;
const formatMs = (value) =>
  value === "N/A" || value === null || value === undefined
    ? "N/A"
    : `${Math.round(value)}ms`;
const formatDuration = (value) => {
  if (value === "N/A" || value === null || value === undefined) return "N/A";
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} MIN`;
};

// Config
const RANKING_LIMIT = 5;
const FETCH_INTERVAL = 60000;
const FETCH_TIMEOUT = 10000;

// Home component
const Home = () => {
  // Navigate
  const navigate = useNavigate();

  // States
  const [liveStats, setLiveStats] = useState(null);
  const [homeLeaderboard, setHomeLeaderboard] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);

  // Fetch home leaderboard data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchHomeLeaderboard = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const combinedSignal = AbortSignal.any([
          abortControllerRef.current.signal,
          AbortSignal.timeout(FETCH_TIMEOUT),
        ]);

        const response = await fetch("/api/homeLeaderboard", {
          signal: combinedSignal,
        });
        if (!response.ok) {
          throw new Error(`HTTP error status: ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) setHomeLeaderboard(data);
      } catch (error) {
        console.error("Error fetching home leaderboard:", error);
        if (isMounted) setHomeLeaderboard(null);
      }
    };

    fetchHomeLeaderboard();
    const intervalId = setInterval(fetchHomeLeaderboard, FETCH_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, []);

  // Helper to check if all live stats fields are present and valid
  const hasAllLiveStatsFields = (stats) => {
    const requiredFields = [
      "active_users",
      "total_matches",
      "total_submissions",
      "avg_pass_rate",
      "avg_execution_time",
      "avg_submission_time",
      "most_used_language",
      "most_used_difficulty",
      "avg_survival_time",
      "avg_match_time",
    ];
    return requiredFields.every(
      (field) => stats[field] !== undefined && stats[field] !== null,
    );
  };

  // Handle incoming events
  useEffect(() => {
    const source = new EventSource("http://localhost:5000/api/liveStats");

    // Handle each data set
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (hasAllLiveStatsFields(data)) {
          setLiveStats(data);
        } else {
          console.log("Incomplete live stats data received:", data);
          setLiveStats(null);
        }
      } catch {
        console.error("Invalid JSON data received:", event.data);
      }
    };

    source.onerror = (err) => {
      console.error("SSE connection error:", err);
    };

    // Cleanup on unmount
    return () => {
      source.close();
    };
  }, []);

  // REST OF LOGIC TODO
  // Bunch of placeholder data for now
  const activeChambers = [
    { code: "#X-772_VOID", players: "4/6" },
    { code: "#K-001_CORE", players: "5/6" },
    { code: "#N-912_GRID", players: "2/6" },
  ];
  const rankings = [
    { rank: "01", name: "NULL_POINTER", rate: "98.4%" },
    { rank: "02", name: "STACK_OVERLORD", rate: "94.1%" },
    { rank: "03", name: "HEX_REAPER", rate: "92.8%" },
  ];

  // Build the ticker from live stats, or a connecting message until the first payload arrives
  const tickerText = (
    <>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "ACTIVE PLAYERS: " + liveStats.active_users
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "MATCHES PLAYED: " + liveStats.total_matches
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "SUBMISSIONS: " + liveStats.total_submissions
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "AVG PASS RATE: " + formatPercent(liveStats.avg_pass_rate)
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "AVG EXEC TIME: " + formatMs(liveStats.avg_execution_time)
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "AVG SURVIVAL TIME: " + formatDuration(liveStats.avg_survival_time)
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "AVG MATCH TIME: " + formatDuration(liveStats.avg_match_time)
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "MOST USED LANGUAGE: " +
            (liveStats.most_used_language?.toUpperCase() || "—")
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "MOST PLAYED DIFFICULTY: " +
            (liveStats.most_used_difficulty?.toUpperCase() || "—")
          : "CONNECTING TO LIVE FEED..."}
      </span>
      <span className="text-[15px] mr-8">|</span>
    </>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0b] font-mono text-[#e7c49d]">
      <main className="w-full px-10 pb-20 pt-10">
        <section className="relative mb-12 overflow-hidden">
          <h1 className="relative text-6xl font-black tracking-tight text-[#ffedd1] md:text-7xl">
            CODE CHAMBER
          </h1>

          <p className="relative mt-3 text-m font-bold tracking-[0.10em] text-[#fcdca9]">
            RUSSIAN ROULETTE INSPIRED MULTIPLAYER CODING GAME
          </p>
        </section>

        {/* Ticker */}
        <div className="relative left-1/2 mb-10 w-screen -translate-x-1/2 overflow-hidden border-y border-[#4b4133] bg-gray-950 py-2 select-none pointer-events-none">
          <div className="marquee-track whitespace-nowrap">
            {[0, 1].map((copy) => (
              <span
                key={copy}
                aria-hidden={copy > 0}
                className="shrink-0 inline-block text-sm font-bold tracking-wider text-[#d5b68f]"
              >
                {tickerText}
              </span>
            ))}
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
          {/* Create Chamber card */}
          <ActionCard
            title="CREATE CHAMBER"
            tag="V.1.0_READY"
            description="Host a Room Of Your Choice. Set the Difficulty. Invite Your Friends. Survive the Challenge."
            buttonText="START INSTANCE"
            primary
            onClick={() => navigate("/create")}
          />

          {/* Join Chamber card */}
          <ActionCard
            title="JOIN CHAMBER"
            tag="SCANNING_ACTIVE"
            description="Enter the lobby. Navigate active servers. Accept the challenge. Survival is the only metric for success."
            buttonText="SCAN SERVERS"
            onClick={() => navigate("/browse")}
          />

          {/* Active Chambers card */}
          <aside className="space-y-4">
            <Panel title="GLOBAL_RANKING">
              <div className="space-y-2">
                {activeChambers.map((room) => (
                  <button
                    key={room.code}
                    onClick={() => navigate("/browse")}
                    className="flex w-full cursor-pointer items-center justify-between border border-[#302b24] bg-[#181818] px-3 py-3 text-left text-sm font-bold text-[#d8c09d] transition-colors duration-200 hover:bg-[#252019]"
                  >
                    <span>{room.code}</span>
                    <span className="text-[#ffd99d]">{room.players}</span>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="GAME_STATS">
              <div className="space-y-1">
                {rankings.map((player) => (
                  <div
                    key={player.rank}
                    className="flex items-center gap-3 border-l-2 border-[#5e503d] px-2 py-3 first:border-[#ffd99d] first:bg-[#211f1b]"
                  >
                    <span className="text-xl font-black text-[#d9bd89]">
                      {player.rank}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#e6cfaa]">
                        {player.name}
                      </p>
                      <p className="mt-1 text-[12px] text-[#aa977b]">
                        {player.rate} SURVIVAL RATE
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </section>

        <section className="mt-18  grid border border-[#4b4133] bg-[#111111] md:grid-cols-3">
          <Stat
            label="TOTAL_CHAMBERS_RUN"
            value={liveStats ? liveStats.total_matches : "..."}
          />
          <Stat
            label="AVERAGE_COMPILE_TIME"
            value={liveStats ? formatMs(liveStats.avg_execution_time) : "..."}
          />
          <Stat
            label="AVG_PASS_RATE"
            value={liveStats ? formatPercent(liveStats.avg_pass_rate) : "..."}
            last
          />
        </section>
      </main>
    </div>
  );
};

// Action card component for the home page
const ActionCard = ({
  title,
  tag,
  description,
  buttonText,
  primary = false,
  onClick,
}) => (
  <article className="flex min-h-[455px] flex-col border border-[#4b4133] bg-[#111111] p-6 [background-image:radial-gradient(#5b4e3e_0.7px,transparent_0.7px)] [background-size:14.1px_14.1px]">
    <div className="flex items-center justify-between">
      <span className="text-2xl text-[#ffd99d]">{primary ? "⊞" : "◉"}</span>
      <span className="border border-[#9e8968] px-2 py-1 text-[10px] font-bold text-[#d8c09d]">
        {tag}
      </span>
    </div>

    <h2 className="mt-7 text-4xl font-black text-[#f1eee7]">{title}</h2>
    <p className="mt-4 max-w-sm text-md leading-6 text-[#c7b499]">
      {description}
    </p>

    <button
      onClick={onClick}
      className={`mt-auto cursor-pointer border py-4 text-xs font-black tracking-widest transition-colors duration-200 ${
        primary
          ? "border-[#ffd99d] bg-[#ffd99d] text-[#1a1712] hover:bg-[#e7bc76]"
          : "border-[#cda979] bg-[#dfbb96] text-[#211b14] hover:bg-[#efceaa]"
      }`}
    >
      {buttonText} ◫
    </button>
  </article>
);

// Panel component for the home page (goes on the side of the action cards)
const Panel = ({ title, children }) => (
  <section className="border border-[#4b4133] bg-[#111111] p-5">
    <div className="mb-4 flex items-center justify-between border-b border-[#4b4133] pb-3">
      <h2 className="text-md font-bold tracking-wider text-[#d8c09d]">
        {title}
      </h2>
      <span className="text-[#ffd99d]">◉</span>
    </div>
    {children}
  </section>
);

// Stat component for the home page (goes at the bottom)
const Stat = ({ label, value, last = false }) => (
  <div
    className={`px-5 py-5 ${last ? "" : "border-b border-[#4b4133] md:border-b-0 md:border-r"}`}
  >
    <p className="text-[12px] font-bold tracking-wider text-[#b39c7e]">
      {label}
    </p>
    <p className="mt-1 text-3xl font-black text-[#eac18a]">{value}</p>
  </div>
);

export default Home;
