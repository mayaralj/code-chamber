import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { socket } from "../socket";

const PublicRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState({ code: "", message: "" });

  // Notify server that user is on public rooms page
  useEffect(() => {
    socket.emit("public-rooms", { onPage: true });
    return () => {
      socket.emit("public-rooms", { onPage: false });
    };
  }, []);

  // Fetch list of public rooms
  useEffect(() => {
    socket.on("rooms-list", (rooms) => {
      setRooms(rooms);
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
    socket.emit("join-room", { code: code.toUpperCase() }); // Temp username

    // Listen for room joined event
    socket.once("room-joined", ({ roomInfo }) => {
      // Turn off error listener in case they joined successfully
      socket.off("room-join-error");
      // Clear error state
      setError({ code: "", message: "" });
      // Navigate to room wait with the room code and players list
      navigate(`/room-wait/${code}`, {
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

  // Display list of public rooms with option to click and join
  return (
    // Container for rooms
    <div className="min-h-screen relative bg-gray-950 text-white flex flex-col gap-8 p-32">
      {/* Title */}
      <h1 className="text-4xl self-center font-bold mb-3 -mt-16">
        Public Rooms
      </h1>
      {/* Room List Container */}
      <div
        className="grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5
        gap-6 items-start"
      >
        {/* Display each room from data */}
        {rooms.map((room) => (
          // Individual room container
          <div
            key={room.code}
            className="bg-gray-800 p-4 rounded-lg flex flex-col gap-2"
          >
            {/* Room Info */}
            <h2 className="text-xl font-bold">{room.roomName}</h2>
            <p>Host: {room.host}</p>
            <p>
              Difficulty:{" "}
              {room.difficulty.charAt(0).toUpperCase() +
                room.difficulty.slice(1)}
            </p>
            <p>
              Players: {room.players.length}/{room.maxPlayers}
            </p>
            <button
              className="bg-orange-100 hover:bg-orange-200 text-gray-950 font-bold py-2 px-4 rounded cursor-pointer mt-2"
              onClick={() => handleJoin(room.code)}
            >
              Join Room
            </button>
            {/* Display Error if exists */}
            {error && error.code === room.code && (
              <p className="text-red-500">{error.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicRooms;
