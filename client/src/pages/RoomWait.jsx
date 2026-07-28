import { useNavigate, useLocation, useParams } from "react-router-dom";
import { socket } from "../socket";
import { useState, useEffect, useRef } from "react";
import { LoaderCircle, Crown } from "lucide-react";
import usePlayer from "../hooks/usePlayer.js";

const RoomWait = () => {
  // Code
  const { code } = useParams();
  const navigate = useNavigate();
  // Get Info passed from Join or CreateRoom
  const location = useLocation();
  const { roomInfo } = location.state || {};
  const { player } = usePlayer();
  const isHost = roomInfo?.host === player?.username;
  // Host starting state
  const [hostStarting, setHostStarting] = useState(false);

  // Game started ref
  const gameStartedRef = useRef(false);

  // Players state to track current players in this room
  const [players, setPlayers] = useState(roomInfo?.players || []);

  // Game starting state
  const [gameStarting, setGameStarting] = useState(false);

  // Game starting error
  const [gameStartingError, setGameStartingError] = useState("");

  // Check with server if user is supposed to be in this room
  useEffect(() => {
    socket.emit("check-room", { code });
    socket.once("check-room-response", ({ valid }) => {
      if (!valid) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      socket.off("check-room-response");
    };
  }, [code, navigate]);

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

    // Listen for start game error
    socket.on("start-game-error", ({ message }) => {
      setGameStartingError(message);
      setHostStarting(false);
    });

    // Listen for game starting
    socket.on("game-starting", () => {
      setGameStarting(true);
    });

    // Listen for game started
    socket.on(
      "game-started",
      ({ code, serverPlayers, endsAt, question, beforeRoundEvents }) => {
        gameStartedRef.current = true;
        console.log(`Game started in room ${code}`);
        navigate(`/game/${code}`, {
          replace: true,
          state: {
            players: serverPlayers,
            endsAt,
            question,
            beforeRoundEvents,
          },
        });
      },
    );

    // Listen for host left
    socket.on("host-left", () => {
      console.log("Host left, redirecting to home");
      navigate("/", { replace: true });
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("game-started");
      socket.off("host-left");
      socket.off("game-starting");
      if (!gameStartedRef.current) {
        socket.emit("leave-room", { code });
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
    // Ensure host
    if (!isHost) {
      return;
    }

    // Ensure at least 1 player
    if (players.length < 1) {
      setGameStartingError("Not enough players to start game");
      return;
    }

    setHostStarting(true);
    socket.emit("start-game", { code });
  };

  // Handle leave room by emitting leave room event and navigating back to home
  const handleLeave = () => {
    socket.emit("leave-room", { code });
    navigate("/browse", { replace: true });
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-[#0b0b0b] px-4 py-20 font-mono text-[#e7c49d] [background-image:radial-gradient(#5b4e3e_0.55px,transparent_0.55px)] [background-size:20px_20px] sm:px-6">
      {gameStarting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b0b0b]/90 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md border border-[#ffdd9d] bg-[#151515] p-8 text-center shadow-[0_0_50px_rgba(255,221,157,0.12)]">
            <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-[#ffdd9d]" />

            <h2 className="mt-6 text-2xl font-black tracking-[0.12em] text-[#f1eee7]">
              GAME STARTING
            </h2>

            <p className="mt-3 text-sm tracking-[0.08em] text-[#b8a181]">
              INITIALIZING CHAMBER, PLEASE WAIT...
            </p>
          </div>
        </div>
      )}
      <main className="mx-auto grid h-full w-full max-w-[680px] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-6">
        <section className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-[#f1eee7] sm:text-4xl md:text-5xl">
            WAITING FOR CHAMBER INITIALIZATION
          </h1>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoCard
            label="ROOM NAME"
            value={roomInfo?.roomName || "#UNKNOWN"}
          />
          <InfoCard label="ROOM CODE" value={roomInfo?.code || code} />
          <InfoCard
            label="DIFFICULTY"
            value={roomInfo?.difficulty?.toUpperCase() || "EASY"}
          />
          <InfoCard
            label="PLAYERS"
            value={`${players.length} / ${roomInfo?.maxPlayers || 0}`}
            accent={
              players.length === roomInfo?.maxPlayers
                ? "text-[#e6aaa1]"
                : "text-[#ffdd9d]"
            }
          />
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-bold tracking-[0.14em] text-[#d8c09d]">
              ACTIVE_PARTICIPANTS
            </h2>
            <div className="h-px flex-1 bg-[#39342c]" />
          </div>

          <div
            className="mt-4 grid min-h-0 flex-1 gap-2"
            style={{
              gridTemplateRows: `repeat(${roomInfo?.maxPlayers || 1}, minmax(0, 1fr))`,
            }}
          >
            {players.map((otherPlayer, index) => (
              <article
                key={otherPlayer.username}
                className="flex min-h-0 items-center justify-between border border-[#4b4133] bg-[#1a1a1a] px-3 py-2 sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#8b7658] text-[#ffdd9d] sm:h-10 sm:w-10">
                    {roomInfo.host === otherPlayer.username ? (
                      <Crown className="h-4 w-4" />
                    ) : (
                      "◉"
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#f1eee7] sm:text-lg">
                      {otherPlayer.displayName}
                    </p>
                    <p className="truncate text-[9px] font-bold tracking-wider text-[#9e8968] sm:text-[10px]">
                      {otherPlayer.username}
                    </p>
                  </div>
                </div>

                <span className="ml-3 shrink-0">
                  <span className="inline-block h-2 w-2 bg-[#ffdd9d]" />
                </span>
              </article>
            ))}

            {Array.from({
              length: Math.max(0, (roomInfo?.maxPlayers || 0) - players.length),
            }).map((_, index) => (
              <article
                key={`empty-${index}`}
                className="flex min-h-0 items-center border border-dashed border-[#39342c] px-3 py-2 text-[#665c50] sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-dashed border-[#4b4133] sm:h-10 sm:w-10">
                    <LoaderCircle className="h-4 w-4 animate-[spin_3s_linear_infinite] text-[#8b7658]" />
                  </div>
                  <p className="truncate text-sm italic sm:text-base">
                    Waiting for Player...
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {gameStartingError && (
            <div
              className="border border-[#b86d65] bg-[#2a1717] px-4 py-3 text-center text-xs font-bold tracking-[0.08em] text-[#f0aaa2]"
              role="alert"
            >
              ERROR: {gameStartingError}
            </div>
          )}

          <div
            className={`grid gap-3 ${
              isHost && players.length > 0 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {isHost && players.length > 0 && (
              <button
                onClick={handleStart}
                disabled={gameStarting || hostStarting}
                className="cursor-pointer border border-[#ffdd9d] bg-[#ffdd9d] py-3 text-sm font-black tracking-[0.1em] text-[#251b0f] disabled:cursor-not-allowed disabled:opacity-50 sm:py-5 sm:text-2xl"
              >
                {hostStarting ? "STARTING GAME..." : "START GAME"}
              </button>
            )}

            <button
              onClick={handleLeave}
              disabled={gameStarting}
              className="cursor-pointer border border-[#d8b77f] bg-transparent py-3 text-sm font-black tracking-[0.1em] text-[#e7c49d] disabled:cursor-not-allowed disabled:opacity-50 sm:py-5 sm:text-2xl"
            >
              LEAVE ROOM
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

const InfoCard = ({ label, value, accent }) => (
  <article className={`border border-[#4b4133] bg-[#1a1a1a] px-4 py-4`}>
    <p className="text-[10px] font-bold tracking-[0.14em] text-[#a9977e]">
      {label}
    </p>
    <p
      className={`mt-2 text-lg font-bold ${
        value.toLowerCase() == "hard"
          ? "text-[#e6aaa1]"
          : value.toLowerCase() == "medium"
            ? "text-[#dea566]"
            : value.toLowerCase() == "easy"
              ? "text-[#e7c49d]"
              : accent
                ? accent
                : "text-[#f1eee7]"
      }`}
    >
      {value}
    </p>
  </article>
);

export default RoomWait;
