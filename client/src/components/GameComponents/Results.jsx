const Results = ({ results, eliminatedPlayers, missedPlayer, winner }) => {
  console.log("Rendering Results with results:", results);
  // Results modal that happens after every round centered in the middle
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex w-[560px] flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-7">
        <h1 className="text-center text-xl font-bold text-zinc-100">
          Round Results
        </h1>
        {/* Categories listing */}
        <div className="grid grid-cols-6 gap-2 border-b border-zinc-800 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          <span>Player</span>
          <span>Passed</span>
          <span>Tests</span>
          <span>Exec (ms)</span>
          <span>Submit (s)</span>
          <span>Score</span>
        </div>
        {/* Create a list of each players results */}
        {results.map((result, index) => (
          <div
            key={index}
            className="grid grid-cols-6 gap-2 border-b border-zinc-800/60 pb-2 text-center text-sm text-zinc-300 last:border-b-0"
          >
            <span className="font-semibold text-zinc-100">
              {result.player.username}
            </span>
            <span
              className={
                result.passed
                  ? "font-medium text-emerald-400"
                  : "font-medium text-rose-400"
              }
            >
              {result.passed ? "Yes" : "No"}
            </span>
            <span>{result?.testCasesPassed}</span>
            <span>
              {result.executionTime ? Math.round(result.executionTime) : "N/A"}
            </span>
            <span>{result?.submitTime}</span>
            {/* Total score */}
            <span className="font-semibold text-[#ffd99d]">{result.score}</span>
          </div>
        ))}

        {/* Missed Player */}
        {missedPlayer && (
          <div className="rounded-lg border border-[#4b4133]/20 bg-[#4b4133]/5 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ffd687]/50">
              Missed Player
            </p>
            <p className="mt-1 text-sm text-zinc-200">{missedPlayer}</p>
          </div>
        )}
        {/* Player Eliminated Under all the players and their scores */}
        {eliminatedPlayers.length > 0 && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
              Players Eliminated
            </p>
            <ul className="mt-2 space-y-1">
              {eliminatedPlayers.map((player, index) => (
                <li key={index} className="text-sm text-zinc-200">
                  {player}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Winner Announcement */}
        {winner && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Winner
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-300">{winner}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
