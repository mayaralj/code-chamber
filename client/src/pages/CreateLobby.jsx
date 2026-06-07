import { useNavigate } from "react-router-dom";
import { useState } from "react";
import socket from "../socket";

const CreateLobby = () => {
  // Username state
  const [username, setUsername] = useState("Mayar"); // Temp username
  // Lobby name state
  const [lobbyName, setLobbyName] = useState("");
  // Difficulty state
  const [difficulty, setDifficulty] = useState("easy"); // default difficulty
  // MaxPlayer state
  const [maxPlayers, setMaxPlayers] = useState(4); // default max players
  // Public or Private state
  const [isPublic, setIsPublic] = useState(true); // default to public

  const navigate = useNavigate();

  // Handle create function
  const handleCreate = () => {
    // Ensure a real username
    if (username.trim() === "") {
      return;
    }

    // Emit create room to server
    socket.emit("create-room", {
      username,
      lobbyName,
      maxPlayers,
      isPublic,
      difficulty,
    });
    // Listen for room created event
    socket.once("room-created", ({ roomInfo }) => {
      navigate(`/game-wait/${roomInfo.code}`, {
        state: { username, roomInfo, isHost: true },
      });
    });
  };
  return (
    // Create lobby form
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start pt-35 gap-6">
      {/* Title */}
      <div className="text-4xl font-bold font-mono">Create Lobby</div>
      {/* Form Container */}
      <div className="bg-gray-800 pt-10 pb-10 pl-12 pr-12 rounded-xl flex flex-col gap-8">
        {/* Input for lobby name */}
        <input
          type="text"
          value={lobbyName}
          onChange={(e) => setLobbyName(e.target.value)}
          placeholder="Lobby Name (4-20 characters)"
          className="bg-gray-700 text-white placeholder:text-gray-500 border border-gray-600 px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-100 w-96"
        />

        {/* Selector for game difficulty */}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-100"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {/* Selector for number of max players */}
        <select
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
          className="bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-100"
        >
          <option value="2">2 Players</option>
          <option value="4">4 Players</option>
          <option value="6">6 Players</option>
        </select>

        {/* Selector if public or private lobby */}
        <select
          value={isPublic}
          onChange={(e) => setIsPublic(e.target.value === "public")}
          className="bg-gray-700 text-white border border-gray-600 px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-orange-100"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        {/* Create Button */}
        <button
          className="bg-orange-100 cursor-pointer hover:bg-orange-200 text-gray-800 text-2xl font-bold py-1 px-4 rounded self-center"
          onClick={handleCreate}
        >
          Create Lobby
        </button>
      </div>
    </div>
  );
};

export default CreateLobby;
