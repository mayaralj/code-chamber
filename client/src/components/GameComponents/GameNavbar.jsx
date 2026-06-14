import { useState } from "react";

const GameNavbar = ({ onSubmit, playersList }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });

  const handleOpenModal = (e) => {
    const rect = e.target.getBoundingClientRect();
    setModalPos({ x: rect.left, y: rect.bottom + 10 });
    setShowModal(true);
  };

  return (
    <div className="w-full bg-gray-900 py-3 flex justify-center items-center relative">
      <button
        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer mx-auto"
        onClick={onSubmit}
      >
        Submit
      </button>
      {/* Button to display submitted players */}
      <button
        className="bg-gray-500/20 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer absolute left-4"
        onClick={handleOpenModal}
      >
        Player List
      </button>
      {/* Modal for displaying submitted players */}
      {showModal && (
        <div
          className="fixed z-50"
          style={{ top: modalPos.y, left: modalPos.x }}
        >
          <div className="bg-gray-950/50 backdrop-blur-sm p-8 rounded-lg flex flex-col gap-4 w-96">
            <h2 className="text-2xl text-white font-bold mb-4">Players</h2>
            {/* List out players, put an icon next to them for submtited or not submitted */}
            {playersList.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 text-white text-lg"
              >
                <div
                  className={`w-3 h-3 rounded-full ${player.submitted ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                {player.username}
              </div>
            ))}

            <button
              className="bg-gray-700/30 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 self-end cursor-pointer "
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameNavbar;
