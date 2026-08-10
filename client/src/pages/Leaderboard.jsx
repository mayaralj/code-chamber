// Imports
import { useState, useEffect } from "react";

// Leaderboard.jsx
const Leaderboard = () => {
  // States
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Placeholder value for each leaderboard
  const mostWinsPlaceholder = [
    { username: "Player1", wins: 10 },
    { username: "Player2", wins: 8 },
    { username: "Player3", wins: 6 },
    { username: "Player4", wins: 10 },
    { username: "Player5", wins: 8 },
    { username: "Player6", wins: 6 },
    { username: "Player7", wins: 10 },
    { username: "Player8", wins: 8 },
    { username: "Player9", wins: 6 },
    { username: "Player10", wins: 10 },
  ];
  const mostGamesPlayedPlaceholder = [
    { username: "Player1", gamesPlayed: 20 },
    { username: "Player2", gamesPlayed: 18 },
    { username: "Player3", gamesPlayed: 16 },
    { username: "Player4", gamesPlayed: 20 },
    { username: "Player5", gamesPlayed: 18 },
    { username: "Player6", gamesPlayed: 16 },
    { username: "Player7", gamesPlayed: 20 },
    { username: "Player8", gamesPlayed: 18 },
    { username: "Player9", gamesPlayed: 16 },
    { username: "Player10", gamesPlayed: 20 },
  ];
  const fastestCodePlaceholder = [
    { username: "Player1", time: 30 },
    { username: "Player2", time: 45 },
    { username: "Player3", time: 60 },
    { username: "Player4", time: 30 },
    { username: "Player5", time: 45 },
    { username: "Player6", time: 60 },
    { username: "Player7", time: 30 },
    { username: "Player8", time: 45 },
    { username: "Player9", time: 60 },
    { username: "Player10", time: 30 },
  ];

  return (
    // Display leaderboard in 3 columns
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-4xl font-bold mb-8 text-white">Leaderboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Most Wins */}
        <div className="bg-gray-1000 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl text-white font-semibold mb-4">Most Wins</h2>
          <ul>
            {mostWinsPlaceholder.map((player, index) => (
              <li key={index} className="mb-2 text-white">
                {index + 1}. {player.username} - {player.wins} wins
              </li>
            ))}
          </ul>
        </div>
        {/* Most Games Played */}
        <div className="bg-gray-1000 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl text-white font-semibold mb-4">
            Most Games Played
          </h2>
          <ul>
            {mostGamesPlayedPlaceholder.map((player, index) => (
              <li key={index} className="mb-2 text-white">
                {index + 1}. {player.username} - {player.gamesPlayed} games
              </li>
            ))}
          </ul>
        </div>
        {/* Fastest Code */}
        <div className="bg-gray-1000 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl text-white font-semibold mb-4">
            Fastest Code
          </h2>
          <ul>
            {fastestCodePlaceholder.map((player, index) => (
              <li key={index} className="mb-2 text-white">
                {index + 1}. {player.username} - {player.time} seconds
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
