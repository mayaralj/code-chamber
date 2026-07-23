import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { socket } from "../socket";

const Browse = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState({ code: "", message: "" });
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [maxPlayerCountFilter, setMaxPlayerCountFilter] = useState("ALL");
  const [inProgressFilter, setInProgressFilter] = useState("ALL");
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [privateCode, setPrivateCode] = useState("");
  const [visibleRoomCount, setVisibleRoomCount] = useState(9);

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

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.roomName
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesDifficulty =
      difficultyFilter === "ALL" ||
      room.difficulty.toLowerCase() === difficultyFilter.toLowerCase();

    const matchesMaxPlayerCount =
      maxPlayerCountFilter === "ALL" ||
      room.maxPlayers === parseInt(maxPlayerCountFilter);

    const matchesInProgress =
      inProgressFilter === "ALL" ||
      room.isGameStarted === (inProgressFilter === "IN_PROGRESS");

    return (
      matchesSearch &&
      matchesDifficulty &&
      matchesMaxPlayerCount &&
      matchesInProgress
    );
  });

  // Display list of public rooms with option to click and join
  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#0b0b0b] px-10 py-14 font-mono text-[#e7c49d] [background-image:radial-gradient(#5b4e3e_0.6px,transparent_0.6px)] [background-size:20px_20px]">
      <div className="mx-auto max-w-[1200px]">
        <section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tight text-[#f1eee7] md:text-7xl">
              PUBLIC CHAMBERS
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 tracking-wide text-[#c7b499]">
              Select an open session to begin. Higher difficulty chambers yield
              more reputation points.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowPrivateModal(true)}
              className="cursor-pointer border border-[#9e8968] bg-[#111111] px-7 py-4 text-sm font-bold tracking-wider text-[#e7c49d] transition-colors hover:border-[#ffd99d] hover:text-[#ffd99d]"
            >
              ⚿ PRIVATE JOIN
            </button>

            <button
              onClick={() => navigate("/create")}
              className="cursor-pointer border border-[#ffdd9d] bg-[#ffdd9d] px-7 py-4 text-sm font-bold tracking-wider text-[#251b0f] transition-colors hover:bg-[#e7bc76]"
            >
              + CREATE ROOM
            </button>
          </div>
        </section>

        <section className="mt-14 flex flex-col gap-4 sm:flex-row">
          <label className="flex w-full items-center border border-[#4b4133] bg-[#111111] px-4 sm:max-w-[330px]">
            <span className="mr-3 text-xl text-[#9e8968]">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH FOR ROOMS..."
              className="w-full bg-transparent py-4 text-sm text-[#e7c49d] outline-none placeholder:text-[#5c5143]"
            />
          </label>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="cursor-pointer border border-[#4b4133] bg-[#111111] px-4 py-4 text-sm font-bold tracking-wider text-[#e7c49d] outline-none focus:border-[#d8b77f]"
          >
            <option value="ALL">ALL DIFFICULTIES</option>
            <option value="Easy">EASY</option>
            <option value="Medium">MEDIUM</option>
            <option value="Hard">HARD</option>
          </select>
          <select
            value={maxPlayerCountFilter}
            onChange={(e) => setMaxPlayerCountFilter(e.target.value)}
            className="cursor-pointer border border-[#4b4133] bg-[#111111] px-4 py-4 text-sm font-bold tracking-wider text-[#e7c49d] outline-none focus:border-[#d8b77f]"
          >
            <option value="ALL">ALL PLAYER COUNTS</option>
            <option value="2">2 PLAYERS</option>
            <option value="3">3 PLAYERS</option>
            <option value="4">4 PLAYERS</option>
            <option value="5">5 PLAYERS</option>
            <option value="6">6 PLAYERS</option>
          </select>
          <select
            value={inProgressFilter}
            onChange={(e) => setInProgressFilter(e.target.value)}
            className="cursor-pointer border border-[#4b4133] bg-[#111111] px-4 py-4 text-sm font-bold tracking-wider text-[#e7c49d] outline-none focus:border-[#d8b77f]"
          >
            <option value="ALL">ALL GAMES</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="NOT_IN_PROGRESS">NOT IN PROGRESS</option>
          </select>
        </section>

        <section className="mt-10 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.slice(0, visibleRoomCount).map((room) => {
            const isFull = room.players.length >= room.maxPlayers;
            const gameStarted = room.isGameStarted;
            console.log(gameStarted);

            return (
              <article
                key={room.code}
                className={`border p-7 ${
                  gameStarted
                    ? "border-[#2f2c27] bg-[#151515] opacity-55"
                    : isFull
                      ? "border-[#2f2c27] bg-[#151515] opacity-55"
                      : "border-[#4b4133] bg-[#191919]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-black text-[#ffdd9d]">
                    {room.roomName}
                  </h2>

                  <span
                    className={`px-2 py-1 text-[12px] font-bold ${
                      gameStarted
                        ? "bg-[#2f2c27] text-[#8e8477]"
                        : isFull
                          ? "bg-[#30302d] text-[#8e8477]"
                          : "bg-[#546b5a] text-[#080812] font-bold"
                    }`}
                  >
                    {gameStarted
                      ? "IN PROGRESS"
                      : isFull
                        ? "ROOM FULL"
                        : "JOINABLE"}
                  </span>
                </div>

                <div className="mt-7 space-y-5 text-sm">
                  <RoomDetail label="HOST" value={room.host || "ROOT_ADMIN"} />
                  <RoomDetail
                    label="DIFFICULTY"
                    value={room.difficulty.toUpperCase()}
                    valueClass={
                      room.difficulty.toLowerCase() === "hard"
                        ? "text-[#e6aaa1]"
                        : room.difficulty.toLowerCase() === "medium"
                          ? "text-[#dea566]"
                          : "text-[#e7c49d]"
                    }
                  />
                  <RoomDetail
                    label="PLAYERS"
                    value={`${room.players.length}/${room.maxPlayers}`}
                    valueClass="text-[#ffdd9d]"
                  />
                </div>

                <button
                  disabled={isFull}
                  onClick={() => handleJoin(room.code)}
                  className={`mt-9 w-full border py-4 text-sm font-bold tracking-wider transition-colors ${
                    isFull || gameStarted
                      ? "cursor-not-allowed border-[#30302d] bg-[#292929] text-[#81786b]"
                      : "cursor-pointer border-[#ffdd9d] bg-[#ffdd9d] text-[#251b0f] hover:bg-[#e7bc76]"
                  }`}
                >
                  {gameStarted
                    ? "IN PROGRESS"
                    : isFull
                      ? "FULL"
                      : "JOIN ROOM  ›"}
                </button>

                {error.code === room.code && (
                  <p className="mt-3 text-sm text-red-400">{error.message}</p>
                )}
              </article>
            );
          })}
        </section>

        {rooms.length === 0 && (
          <p className="mt-16 text-center text-sm tracking-wider text-[#8e806d]">
            NO ACTIVE PUBLIC CHAMBERS DETECTED
          </p>
        )}

        {/* Add View more chamber button only available when there are more rooms to show */}
        {visibleRoomCount < filteredRooms.length && (
          <button
            className="mx-auto mt-16 block cursor-pointer border border-[#8b7658] px-12 py-4 text-sm font-bold tracking-wider text-[#d8c09d] transition-colors hover:border-[#ffd99d] hover:text-[#ffd99d]"
            onClick={() =>
              setVisibleRoomCount((prev) => {
                const newCount = prev + 9;
                return newCount > filteredRooms.length
                  ? filteredRooms.length
                  : newCount;
              })
            }
          >
            VIEW MORE CHAMBERS
          </button>
        )}
      </div>

      {showPrivateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
          <div className="relative w-full max-w-[470px] border border-[#c99d46] bg-[#0b0b0b] p-10 shadow-[0_0_25px_rgba(201,157,70,0.25)]">
            <span className="absolute -top-3 left-6 bg-[#0b0b0b] px-2 text-[10px] font-bold tracking-[0.18em] text-[#e7c49d]">
              AUTHENTICATION_REQUIRED
            </span>

            <h2 className="text-4xl font-black tracking-tight text-[#f1eee7]">
              ACCESS PRIVATE CHAMBER
            </h2>

            <div className="mt-4 h-1 w-12 bg-[#ffdd9d]" />

            <label className="mt-10 block">
              <span className="mb-3 block text-xs font-bold tracking-wider text-[#c7b499]">
                INPUT CHAMBER IDENTIFIER
              </span>

              <input
                autoFocus
                value={privateCode}
                onChange={(e) => setPrivateCode(e.target.value)}
                placeholder="ENTER ACCESS KEY..."
                className="w-full border-b border-[#9e8968] bg-[#191919] px-4 py-5 text-[#f1eee7] outline-none placeholder:text-[#4e483e] focus:border-[#ffdd9d]"
              />
            </label>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => handleJoin(privateCode)}
                className="w-full cursor-pointer border border-[#ffdd9d] bg-[#ffdd9d] py-4 text-sm font-bold tracking-[0.18em] text-[#251b0f] transition-colors hover:bg-[#e7bc76]"
              >
                INITIALIZE
              </button>

              <button
                onClick={() => {
                  setShowPrivateModal(false);
                  setPrivateCode("");
                }}
                className="w-full cursor-pointer border border-[#4b4133] bg-transparent py-4 text-sm font-bold tracking-[0.18em] text-[#d8c09d] transition-colors hover:border-[#9e8968]"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RoomDetail = ({ label, value, valueClass = "text-[#f1eee7]" }) => (
  <div className="flex items-center justify-between border-b border-[#39342c] pb-4">
    <span className="tracking-wider text-[#a9977e]">{label}</span>
    <span className={`font-bold tracking-wider ${valueClass}`}>{value}</span>
  </div>
);

export default Browse;
