import { useNavigate } from "react-router-dom";
import { useState } from "react";
import socket from "../socket";

const Join = () => {
  const navigate = useNavigate();
  // Show modal state
  const [showModal, setShowModal] = useState(false);
  // code state for joining by code
  const [code, setCode] = useState("");
  // error state
  const [error, setError] = useState("");

  // Handle join function
  const handleJoin = () => {
    // Check for valid code
    if (code.trim() === "") {
      setError("Please enter a room code");
      return;
    }

    // If length is less than 4, show error
    if (code.trim().length < 4) {
      setError("Room code must be 4 characters");
      return;
    }

    // Emit join room to server
    socket.emit("join-room", { code: code.toUpperCase(), username: "Mayar" }); // Temp username

    // Listen for room joined event
    socket.once("room-joined", ({ roomInfo }) => {
      // Turn off error listener in case they joined successfully
      socket.off("room-join-error");
      // Navigate to game wait with the room code and players list
      navigate(`/room-wait/${code}`, {
        state: { username: "Mayar", isHost: false, roomInfo }, // Temp username
      });
    });

    // Listen for error event
    socket.once("room-join-error", ({ message }) => {
      // Turn off other socket listener
      socket.off("room-joined");
      // Set error message
      setError(message);
    });
  };

  // Join room by code or by going to the list of public rooms
  return (
    <div className="relative min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8">
      {/* Title */}
      <h1 className="text-4xl font-bold mb-3 -mt-16">Pick a Join Method</h1>
      {/* Container to pick join method */}
      <div className="flex flex-row gap-20">
        {/* Join by Code Button */}
        <button
          className="cursor-pointer bg-orange-50 text-gray-900 w-64 font-bold px-12 py-5 rounded hover:bg-orange-100"
          onClick={() => setShowModal(true)}
        >
          Join by Code
        </button>
        {/* Browse Public Rooms Button */}
        <button
          className="cursor-pointer bg-orange-50 text-gray-900 font-bold w-64 px-12 py-5 rounded hover:bg-orange-100"
          onClick={() => navigate("/rooms")}
        >
          Browse Public Rooms
        </button>
      </div>

      {/* Modal for joining by code */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-gray-800 p-8 rounded-lg flex flex-col gap-4 w-96">
            {/* Title */}
            <h2 className="text-2xl font-bold">Enter Room Code</h2>
            {/* Input for room code */}
            <input
              type="text"
              maxLength={4}
              placeholder="Enter code..."
              className={`bg-gray-700 uppercase placeholder:normal-case text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:ring-1 ${error ? "border-red-500" : "focus:ring-orange-100"}`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {/* Error Message */}
            {error && <p className="text-red-500 -mt-2">{error}</p>}
            {/* Container for buttons */}
            <div className="flex gap-4">
              {/* Join Button */}
              <button
                className="cursor-pointer bg-orange-50 text-gray-900 font-bold py-2 px-6 rounded hover:bg-orange-100 flex-1"
                onClick={handleJoin}
              >
                Join
              </button>
              {/* Cancel Button */}
              <button
                className="cursor-pointer bg-gray-700 text-white font-bold py-2 px-6 rounded hover:bg-gray-600 flex-1"
                onClick={() => {
                  // Reset states and close modal
                  setShowModal(false);
                  setError("");
                  setCode("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Join;
