const Results = ({
  results,
  eliminatedPlayers,
  missedPlayer,
  winner,
  afterRoundEvents,
}) => {
  console.log("Rendering Results with results:", results);
  // Results modal that happens after every round centered in the middle
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-gray-800 rounded-lg p-8 w-[500px] flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Results</h1>
        {/* Categories listing  */}
        <div className="grid grid-cols-6 gap-4 text-center">
          <span className="text-gray-400">Player</span>
          <span className="text-gray-400">Passed</span>
          <span className="text-gray-400">Test Cases Passed</span>
          <span className="text-gray-400">Execution Time (ms)</span>
          <span className="text-gray-400">Submit Time (s)</span>
          <span className="text-gray-400">Score</span>
        </div>
        {/* Create a list of each player's results */}
        {results.map((result, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 text-center">
            <span className="text-white font-semibold">
              {result.player.username}
            </span>
            <span className="text-white">{result.passed ? "Yes" : "No"}</span>
            <span className="text-white">{result?.testCasesPassed}</span>
            <span className="text-white">
              {result.executionTime ? Math.round(result.executionTime) : "N/A"}
            </span>
            <span className="text-white">{result?.submitTime}</span>
            {/* Total score */}
            <span className="text-white">{result.score}</span>
          </div>
        ))}

        {/* After round events */}
        {afterRoundEvents && afterRoundEvents.length > 0 && (
          <div className="mt-4 p-4 text-white rounded-lg text-center">
            <p className="text-xl font-bold">After Round Events:</p>
            <ul>
              {afterRoundEvents.map((event, index) => (
                <li key={index} className="text-lg">
                  {event}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missed Player */}
        {missedPlayer && (
          <div className="mt-4 p-4 text-white rounded-lg text-center">
            <p className="text-xl font-bold">Missed Player:</p>
            <p>{missedPlayer}</p>
          </div>
        )}

        {/* Player Eliminated Under all the players and their scores */}
        {eliminatedPlayers.length > 0 && (
          <div className="mt-4 p-4 text-white rounded-lg text-center">
            <p className="text-xl font-bold">Players Eliminated:</p>
            <ul>
              {eliminatedPlayers.map((player, index) => (
                <li key={index} className="text-lg">
                  {player}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Winner Announcement */}
        {winner && (
          <div className="mt-4 p-4 text-white rounded-lg text-center">
            <p className="text-xl font-bold">Winner:</p>
            <p>{winner}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
