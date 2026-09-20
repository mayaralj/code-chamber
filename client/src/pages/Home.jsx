// Imports
import { useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";

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
    const source = new EventSource("/api/liveStats");

    // Handle each data set
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (hasAllLiveStatsFields(data)) {
          setLiveStats(data);
        } else {
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

  // Build the ticker from live stats, or a connecting message until the first payload arrives
  const tickerText = (
    <>
      <span className="text-[15px] mr-8">
        {liveStats
          ? "PLAYERS ONLINE: " + liveStats.active_users
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
      <main className="w-full px-10 pb-20 pt-16">
        {/* Hero */}
        <section className="mx-auto max-w-5xl text-center">
          <h1 className="text-6xl font-black tracking-tight text-[#ffedd1] md:text-7xl">
            CODE CHAMBER
          </h1>
          <p className="mt-4 text-md font-bold tracking-[0.08em] text-[#fcdca9]">
            The Multiplayer Way To Sharpen Your Coding Skills.
          </p>
          <p className="mt-6 text-[15px] leading-7 text-[#c7b499]">
            A high-stakes multiplayer coding game where your DSA skills can
            truly shine. Survive round after round of coding challenges. Last
            one standing wins.
          </p>
        </section>

        {/* Create / Join cards, centered and moderately sized */}
        <section className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          <ActionCard
            title="CREATE CHAMBER"
            tag="INIT"
            description="Host a match of your own. Set the rules. Invite your friends."
            buttonText="CREATE"
            primary
            onClick={() => navigate("/create")}
          />

          <ActionCard
            title="BROWSE CHAMBERS"
            tag="BROWSE"
            description="Find and join a match hosted by someone else. Compete against other players."
            buttonText="BROWSE"
            onClick={() => navigate("/browse")}
          />
        </section>

        {/* Ticker */}
        <section className="mx-auto text-center mt-10 max-w-5xl">
          <div className="mt-6 overflow-hidden border-y border-[#4b4133] bg-gray-950 py-1.5 select-none pointer-events-none">
            <div className="marquee-track whitespace-nowrap">
              {[0, 1].map((copy) => (
                <span
                  key={copy}
                  aria-hidden={copy > 0}
                  className="shrink-0 inline-block text-[10px] font-bold tracking-wider text-[#d5b68f]"
                >
                  {tickerText}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Global Ranking table */}
        <section className="mx-auto mt-20 max-w-5xl">
          <div className="mb-6 flex items-end justify-center">
            <h2 className="text-3xl font-black tracking-tight text-[#ffd99d]">
              GLOBAL_RANKING
            </h2>
          </div>

          <div className="border border-[#2a251d]">
            <div className="grid grid-cols-[70px_1fr_160px] border-b border-[#2a251d] px-5 py-3 text-xs font-bold tracking-widest text-[#8a7c63]">
              <span>#</span>
              <span>PLAYER</span>
              <span className="text-right">MATCHES WON</span>
            </div>

            {homeLeaderboard?.slice(0, RANKING_LIMIT).map((player, index) => {
              return (
                <div
                  key={player.username}
                  className="grid grid-cols-[70px_1fr_160px] items-center border-b border-[#1c1812] px-5 py-5 last:border-b-0"
                >
                  <span className="text-xl font-black text-[#d9bd89]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#ffd89a]">
                      {player.displayUsername}
                    </span>
                    <span className="text-xs text-[#e7c49d]/50">
                      {player.username}
                    </span>
                  </div>

                  <span className="text-right text-sm font-bold text-[#ffd99d]">
                    {player.win_rate !== undefined
                      ? formatPercent(player.win_rate)
                      : `${player.matches_won ?? 0} WINS`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate("/leaderboard")}
              className="cursor-pointer border border-[#cda979] bg-[#dfbb96] px-8 py-4 text-xs font-black tracking-widest text-[#211b14] transition-colors duration-200 hover:bg-[#efceaa]"
            >
              VIEW FULL LEADERBOARD
            </button>
          </div>
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
  <article className="flex min-h-[300px] flex-col border border-[#4b4133] bg-[#111111] p-7 [background-image:radial-gradient(#5b4e3e_0.7px,transparent_0.7px)] [background-size:14.1px_14.1px]">
    <div className="flex items-center justify-between">
      <span className="text-2xl text-[#ffd99d]">{primary ? "⊞" : "◎"}</span>
      <span className="border border-[#9e8968] px-2 py-1 text-[10px] font-bold text-[#d8c09d]">
        {tag}
      </span>
    </div>

    <h2 className="mt-6 text-3xl font-black text-[#f1eee7]">{title}</h2>
    <p className="mt-3 text-sm leading-6 text-[#c7b499]">{description}</p>

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

export default Home;
