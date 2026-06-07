import { useNavigate, useLocation } from "react-router-dom";
import socket from "../socket";
import { useState, useEffect } from "react";

const GameWait = () => {
  const navigate = useNavigate();
  // Get Info passed from Join or CreateLobby
  const location = useLocation();
  const { username, roomInfo, isHost } = location.state || {};

  // Players state to track current players in this room
  const [players, setPlayers] = useState(roomInfo?.players || []);

  // Ensure they arent trying to enter the room from url only
  useEffect(() => {
    if (!location.state) {
      navigate("/");
    }
  }, []);

  // useEffect to listen for player updates and game start
  useEffect(() => {
    // Listen for player joined
    socket.on("player-joined", ({ players }) => {
      setPlayers(players);
    });

    // Listen for game started
    socket.on("game-started", ({ code }) => {
      navigate(`/game/${code}`, { state: { username, players } });
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("player-joined");
      socket.off("game-started");
    };
  }, [navigate]);

  const handleStart = () => {
    socket.emit("start-game", { code: roomInfo.code });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold mb-3 -mt-16">Waiting for Game</h1>
      {/* Display Lobby name */}
      <p className="text-lg">Lobby Name: {roomInfo?.lobbyName}</p>
      {/* Display Lobby Code */}
      <p className="text-lg">Lobby Code: {roomInfo?.code}</p>
      {/* Display Lobby difficulty */}
      <p className="text-lg">
        Lobby Difficulty:{" "}
        {roomInfo?.difficulty.charAt(0).toUpperCase() + // Keep capitalized first letter
          roomInfo?.difficulty.slice(1)}
      </p>
      {/* Display player count out of max players */}
      <p className="text-lg">
        Players: {players.length}/{roomInfo?.maxPlayers}
      </p>

      {/* Display players in current lobby */}
      <div className="flex flex-col gap-4">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-xl font-bold">{player.username}</p>
          </div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={handleStart}
          className="cursor-pointer bg-orange-50 text-gray-900 font-bold px-12 py-3 rounded hover:bg-orange-100"
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default GameWait;
