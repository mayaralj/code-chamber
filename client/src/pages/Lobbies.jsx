import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import socket from "../socket";

const Lobbies = () => {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState({ code: "", message: "" });

  // Fetch list of public lobbies
  useEffect(() => {
    socket.on("rooms-list", (rooms) => {
      setLobbies(rooms);
    });

    socket.emit("get-rooms");

    // Clean up socket listeners on unmount
    return () => {
      socket.off("rooms-list");
    };
  }, []);

  // Handle join function
  const handleJoin = (code) => {
    // Check for valid code
    if (code.trim() === "") {
      return;
    }

    // CLear previous connections
    socket.off("room-joined");
    socket.off("room-join-error");

    // Emit join room to server
    socket.emit("join-room", { code: code.toUpperCase(), username: "Mayar" }); // Temp username

    // Listen for room joined event
    socket.once("room-joined", ({ roomInfo }) => {
      // Turn off error listener in case they joined successfully
      socket.off("room-join-error");
      // Clear error state
      setError({ code: "", message: "" });
      // Navigate to game wait with the room code and players list
      navigate(`/game-wait/${code}`, {
        state: { username: "Mayar", isHost: false, roomInfo }, // Temp username
      });
    });

    // Listen for error event
    socket.once("room-join-error", ({ message }) => {
      // Turn off other socket listener
      socket.off("room-joined");
      // Set error message
      setError({ code, message });
    });
  };

  // Display list of public lobbies with option to click and join
  return (
    // Container for lobbies
    <div className="min-h-screen relative bg-gray-950 text-white flex flex-col gap-8 p-32">
      {/* Title */}
      <h1 className="text-4xl self-center font-bold mb-3 -mt-16">
        Public Lobbies
      </h1>
      {/* Lobby List Container */}
      <div
        className="grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5
        gap-6 items-start"
      >
        {/* Display each lobby from data */}
        {lobbies.map((lobby) => (
          // Individual lobby container
          <div
            key={lobby.code}
            className="bg-gray-800 p-4 rounded-lg flex flex-col gap-2"
          >
            {/* Lobby Info */}
            <h2 className="text-xl font-bold">{lobby.lobbyName}</h2>
            <p>Host: {lobby.host.username}</p>
            <p>
              Difficulty:{" "}
              {lobby.difficulty.charAt(0).toUpperCase() +
                lobby.difficulty.slice(1)}
            </p>
            <p>
              Players: {lobby.players.length}/{lobby.maxPlayers}
            </p>
            <button
              className="bg-orange-100 hover:bg-orange-200 text-gray-950 font-bold py-2 px-4 rounded cursor-pointer mt-2"
              onClick={() => handleJoin(lobby.code)}
            >
              Join Lobby
            </button>
            {/* Display Error if exists */}
            {error && error.code === lobby.code && (
              <p className="text-red-500">{error.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lobbies;
