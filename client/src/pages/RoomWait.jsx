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

  // Game started ref
  const gameStartedRef = useRef(false);

  // Players state to track current players in this room
  const [players, setPlayers] = useState(roomInfo?.players || []);

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
    socket.emit("start-game", { code });
  };

  // Handle leave room by emitting leave room event and navigating back to home
  const handleLeave = () => {
    socket.emit("leave-room", { code });
    navigate("/browse", { replace: true });
  };

  return (
    <div className="h-screen bg-[#0b0b0b] px-6 py-20 font-mono text-[#e7c49d] [background-image:radial-gradient(#5b4e3e_0.55px,transparent_0.55px)] [background-size:20px_20px]">
      <main className="mx-auto w-full max-w-[680px]">
        <section className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-[#f1eee7] md:text-5xl">
            WAITING FOR CHAMBER INITIALIZATION
          </h1>
        </section>

        <section className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          <InfoCard
            label="ROOM NAME"
            value={roomInfo?.roomName || "#UNKNOWN"}
          />
          <InfoCard label="ROOM CODE" value={roomInfo?.code || code} />
          <InfoCard
            label="DIFFICULTY"
            value={
              roomInfo?.difficulty ? roomInfo.difficulty.toUpperCase() : "EASY"
            }
            accent
          />
          <InfoCard
            label="PLAYERS"
            value={`${players.length} / ${roomInfo?.maxPlayers || 0}`}
            accent
          />
        </section>

        <section className="mt-12">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-bold tracking-[0.14em] text-[#d8c09d]">
              ACTIVE_PARTICIPANTS
            </h2>
            <div className="h-px flex-1 bg-[#39342c]" />
          </div>

          <div className="mt-6 space-y-3">
            {players.map((otherPlayer, index) => (
              <article
                key={otherPlayer.username}
                className="flex items-center justify-between border border-[#4b4133] bg-[#1a1a1a] px-4 py-4"
              >
                <div className="flex items-center gap-4">
                  {/* Host indicator */}
                  <div className="flex h-10 w-10 items-center justify-center border border-[#8b7658] text-lg text-[#ffdd9d]">
                    {roomInfo.host === otherPlayer.username ? (
                      <Crown className="h-4 w-4" />
                    ) : index === 1 ? (
                      "‹›"
                    ) : (
                      "◉"
                    )}
                  </div>

                  <div>
                    <p className="text-lg text-[#f1eee7]">
                      {otherPlayer.displayName}
                    </p>
                    <p className="mt-1 text-[10px] font-bold tracking-wider text-[#9e8968]">
                      {otherPlayer.username}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold tracking-wider text-[#ffdd9d]">
                  <span className="mr-2 inline-block h-2 w-2 bg-[#ffdd9d]" />
                </span>
              </article>
            ))}

            {Array.from({
              length: Math.max(0, (roomInfo?.maxPlayers || 0) - players.length),
            }).map((_, index) => (
              <article
                key={`empty-${index}`}
                className="flex items-center justify-between border border-dashed border-[#39342c] px-4 py-4 text-[#665c50]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center border border-dashed border-[#4b4133] text-lg">
                    <LoaderCircle className="h-4 w-4 animate-[spin_3s_linear_infinite] text-[#8b7658]" />
                  </div>

                  <p className="italic">Waiting for Player...</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className={`mt-14 grid gap-4 ${
            isHost && players.length > 0 ? "sm:grid-cols-2" : "sm:grid-cols-1"
          }`}
        >
          {isHost && players.length > 0 && (
            <button
              onClick={handleStart}
              className="cursor-pointer border border-[#ffdd9d] bg-[#ffdd9d] py-5 text-2xl font-black tracking-[0.1em] text-[#251b0f] transition-colors duration-200 hover:bg-[#e7bc76]"
            >
              START GAME
            </button>
          )}

          <button
            onClick={handleLeave}
            className="cursor-pointer border border-[#d8b77f] bg-transparent py-5 text-2xl font-black tracking-[0.1em] text-[#e7c49d] transition-colors duration-200 hover:bg-[#211d17] hover:text-[#ffdd9d]"
          >
            LEAVE ROOM
          </button>
        </section>
      </main>
    </div>
  );
};

const InfoCard = ({ label, value, accent = false }) => (
  <article className="border border-[#4b4133] bg-[#1a1a1a] px-4 py-4">
    <p className="text-[10px] font-bold tracking-[0.14em] text-[#a9977e]">
      {label}
    </p>
    <p
      className={`mt-2 text-lg font-bold ${
        accent ? "text-[#ffdd9d]" : "text-[#f1eee7]"
      }`}
    >
      {value}
    </p>
  </article>
);

export default RoomWait;
