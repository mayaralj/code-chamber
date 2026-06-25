import { useNavigate, useLocation } from "react-router-dom";
import socket from "../socket";
import { useState, useEffect, useRef } from "react";

const RoomWait = () => {
  const navigate = useNavigate();
  // Get Info passed from Join or CreateRoom
  const location = useLocation();
  const { username, roomInfo, isHost } = location.state || {};

  // Game started ref
  const gameStartedRef = useRef(false);

  // Players state to track current players in this room
  const [players, setPlayers] = useState(roomInfo?.players || []);

  // Check with server if user is supposed to be in this room
  useEffect(() => {
    if (!roomInfo) {
      return;
    }
    socket.emit("check-room", { code: roomInfo.code });
    socket.once("check-room-response", ({ valid }) => {
      if (!valid) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      socket.off("check-room-response");
    };
  }, [roomInfo.code]);

  // useEffect to listen for player updates and game start
  useEffect(() => {
    // Listen for player joined
    socket.on("player-joined", ({ players }) => {
      setPlayers(players);
    });

    // Listen for player leave
    socket.on("player-left", ({ players }) => {
      setPlayers(players);
    });

    // Listen for game started
    socket.on("game-started", ({ code, serverPlayers, endsAt, question }) => {
      gameStartedRef.current = true;
      console.log(`Game started in room ${code}`);
      navigate(`/game/${code}`, {
        replace: true,
        state: { username, players: serverPlayers, endsAt, question },
      });
    });

    // Listen for host left
    socket.on("host-left", () => {
      navigate("/", { replace: true });
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("game-started");
      socket.off("host-left");
      if (!gameStartedRef.current) {
        socket.emit("leave-room", { code: roomInfo.code });
      }
    };
  }, [navigate]);

  // Ensure they arent trying to enter the room from url only
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, []);
  if (!location.state) return null;

  // Handle start game
  const handleStart = () => {
    socket.emit("start-game", { code: roomInfo.code });
  };

  // Handle leave room by emitting leave room event and navigating back to home
  const handleLeave = () => {
    socket.emit("leave-room", { code: roomInfo.code });
    // Redirect host back to create room and other players back to rooms page
    if (isHost) {
      navigate("/create", { replace: true });
      return;
    }
    navigate("/rooms", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold mb-3 -mt-16">Waiting for Game</h1>
      {/* Display Room name */}
      <p className="text-lg">Room Name: {roomInfo?.roomName}</p>
      {/* Display Room Code */}
      <p className="text-lg">Room Code: {roomInfo?.code}</p>
      {/* Display Game difficulty */}
      <p className="text-lg">
        Game Difficulty:{" "}
        {roomInfo?.difficulty.charAt(0).toUpperCase() + // Keep capitalized first letter
          roomInfo?.difficulty.slice(1)}
      </p>
      {/* Display player count out of max players */}
      <p className="text-lg">
        Players: {players.length}/{roomInfo?.maxPlayers}
      </p>

      {/* Display players in current room */}
      <div className="flex flex-col gap-4">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-xl font-bold">{player.username}</p>
          </div>
        ))}
      </div>

      {/* If host show a start game button */}
      {isHost && players.length > 0 && (
        <button
          onClick={handleStart}
          className="cursor-pointer bg-orange-50 text-gray-900 font-bold px-12 py-3 rounded hover:bg-orange-100"
        >
          Start Game
        </button>
      )}
      {/* Show a leave room button */}
      <button
        onClick={handleLeave}
        className="cursor-pointer bg-red-700 text-white font-bold px-12 py-3 rounded hover:bg-red-600"
      >
        Leave Room
      </button>
    </div>
  );
};

export default RoomWait;
