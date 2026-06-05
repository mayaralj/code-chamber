import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Join = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Join lobby by code or by going to the list of public lobbies
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8">
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
        {/* Browse Public Lobbies Button */}
        <button
          className="cursor-pointer bg-orange-50 text-gray-900 font-bold w-64 px-12 py-5 rounded hover:bg-orange-100"
          onClick={() => navigate("/lobbies")}
        >
          Browse Public Lobbies
        </button>
      </div>

      {/* Modal for joining by code */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-lg flex flex-col gap-4 w-96">
            {/* Title */}
            <h2 className="text-2xl font-bold">Enter Lobby Code</h2>
            {/* Input for lobby code */}
            <input
              type="text"
              maxLength={6}
              placeholder="Enter code..."
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-100"
            />
            {/* Container for buttons */}
            <div className="flex gap-4">
              {/* Join Button */}
              <button
                className="cursor-pointer bg-orange-50 text-gray-900 font-bold py-2 px-6 rounded hover:bg-orange-100 flex-1"
                onClick={() => navigate("/lobby/code")} // placeholder for now
              >
                Join
              </button>
              {/* Cancel Button */}
              <button
                className="cursor-pointer bg-gray-700 text-white font-bold py-2 px-6 rounded hover:bg-gray-600 flex-1"
                onClick={() => setShowModal(false)}
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
