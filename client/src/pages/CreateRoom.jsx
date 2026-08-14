import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { socket } from "../socket";

// Config
const CREATE_ROOM_TIMEOUT = 3000;

const CreateRoom = () => {
  // Room name state
  const [roomName, setRoomName] = useState("");
  // Difficulty state
  const [difficulty, setDifficulty] = useState("easy"); // default difficulty
  // MaxPlayer state
  const [maxPlayers, setMaxPlayers] = useState(4); // default max players
  // Public or Private state
  const [isPublic, setIsPublic] = useState(true); // default to public
  // Create error
  const [createError, setCreateError] = useState("");
  // Is creating
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();

  // Handle create function
  const handleCreate = () => {
    // Validate room name
    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName || trimmedRoomName === "") {
      setCreateError("Room name is required");
      return;
    }

    // Set is creating to true, disables button
    setIsCreating(true);

    // Create a unique room id
    const roomId = crypto.randomUUID();
    socket.timeout(CREATE_ROOM_TIMEOUT).emit(
      "create-room",
      {
        roomId,
        roomName: trimmedRoomName,
        maxPlayers,
        isPublic,
        difficulty,
      },
      (err, response) => {
        setIsCreating(false);
        if (err) {
          // Notify server to stop server creation
          socket.emit("cancel-room-creation", { roomId });
          setCreateError("Server not responding. Please try again.");
          return;
        }
        if (response.error) {
          setCreateError(response.error);
          return;
        }
        if (response.roomInfo) {
          setCreateError("");
          navigate(`/room-wait/${response.roomInfo.code}`, {
            state: { roomInfo: response.roomInfo },
          });
        }
      },
    );
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#0b0b0b] px-6 py-20 font-mono text-[#e7c49d]">
      <div className="mx-auto w-full max-w-[610px]">
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-black tracking-[0.18em] text-[#ffdd9d]">
            CREATE CHAMBER
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm font-bold tracking-[0.12em] text-[#c7b499]">
            CREATE A NEW EXECUTION SPACE FOR CODE CHALLENGES.
          </p>
        </div>

        <div className="space-y-10">
          <label className="block">
            <span className="mb-3 block text-xs font-bold tracking-wider text-[#d8c09d]">
              ROOM NAME
            </span>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="ENTER IDENTIFIER..."
              className="w-full border border-[#4b4133] bg-[#111111] px-4 py-4 text-[#f1eee7] outline-none placeholder:text-[#4e483e] focus:border-[#d8b77f] focus:ring-1 focus:ring-[#d8b77f]"
            />
          </label>

          <div className="grid gap-10 sm:grid-cols-2">
            <label className="block">
              <span className="mb-3 block text-xs font-bold tracking-wider text-[#d8c09d]">
                DIFFICULTY
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full cursor-pointer border border-[#4b4133] bg-[#111111] px-4 py-4 text-[#e7c49d] outline-none focus:border-[#d8b77f] focus:ring-1 focus:ring-[#d8b77f]"
              >
                <option value="easy">EASY</option>
                <option value="medium">MEDIUM</option>
                <option value="hard">HARD</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-3 block text-xs font-bold tracking-wider text-[#d8c09d]">
                MAX PLAYERS
              </span>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full cursor-pointer border border-[#4b4133] bg-[#111111] px-4 py-4 text-[#e7c49d] outline-none focus:border-[#d8b77f] focus:ring-1 focus:ring-[#d8b77f]"
              >
                <option value="2">2 PLAYERS</option>
                <option value="3">3 PLAYERS</option>
                <option value="4">4 PLAYERS</option>
                <option value="5">5 PLAYERS</option>
                <option value="6">6 PLAYERS</option>
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-3 text-xs font-bold tracking-wider text-[#d8c09d]">
              VISIBILITY
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`cursor-pointer border py-4 text-sm font-bold transition-colors duration-200 ${
                  isPublic
                    ? "border-[#d8b77f] bg-[#211d17] text-[#ffdd9d]"
                    : "border-[#4b4133] bg-[#111111] text-[#a9977e] hover:border-[#8b7658]"
                }`}
              >
                PUBLIC
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`cursor-pointer border py-4 text-sm font-bold transition-colors duration-200 ${
                  !isPublic
                    ? "border-[#d8b77f] bg-[#211d17] text-[#ffdd9d]"
                    : "border-[#4b4133] bg-[#111111] text-[#a9977e] hover:border-[#8b7658]"
                }`}
              >
                PRIVATE
              </button>
            </div>
          </fieldset>

          <div className="pt-5">
            {createError && (
              <div
                className="mb-5 border border-[#b86d65] bg-[#2a1717] px-4 py-3 text-center text-xs font-bold tracking-[0.08em] text-[#f0aaa2]"
                role="alert"
              >
                ERROR: {createError}
              </div>
            )}
            <button
              disabled={isCreating}
              className="w-full cursor-pointer border border-[#ffdd9d] bg-[#ffdd9d] py-5 text-3xl font-black tracking-[0.12em] text-[#251b0f] transition-colors duration-200 hover:bg-[#e7bc76] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleCreate}
            >
              {isCreating ? "INITIALIZING CHAMBER..." : "CREATE CHAMBER ›"}
            </button>

            <p className="mt-7 text-center text-[10px] font-bold tracking-[0.18em] text-[#564b3c]">
              STANDARD LOBBY PROTOCOL ACTIVE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;
