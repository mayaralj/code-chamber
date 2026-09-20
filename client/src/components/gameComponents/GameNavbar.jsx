import { useState } from "react";
import { Clock, LoaderCircle } from "lucide-react";

const GameNavbar = ({
  codeStatus,
  onSubmit,
  playerList,
  roundTimeLeft,
  isReconnecting,
}) => {
  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Handle open/close of the players dropdown (anchored to the button, no manual position math)
  const handleOpenModal = () => {
    setShowModal((prev) => !prev);
  };

  // Time is considered "running low" once 10 seconds or less remain
  const isLowTime = typeof roundTimeLeft === "number" && roundTimeLeft <= 10;

  // Show a spinning indicator next to Submit while the code is being judged/processed
  const isProcessing = codeStatus === "judging" || codeStatus === "processing";

  return (
    <div className="relative flex w-full items-center justify-between border-b border-[#4b4133]/75 bg-zinc-900 px-7 py-2.5">
      <div className="flex w-24 items-center gap-2 select-none pointer-events-none">
        <Clock
          size={14}
          className={`shrink-0 transition-colors ${
            roundTimeLeft === 0
              ? "text-white/80"
              : isLowTime
                ? "text-rose-400"
                : "text-zinc-500"
          }`}
        />
        <div className="flex items-baseline gap-1">
          <span
            className={`text-xl font-bold tabular-nums transition-colors ${
              roundTimeLeft === 0
                ? "text-white/80"
                : isLowTime
                  ? "[animation:pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite] text-rose-400"
                  : "text-[#f7e7c8]"
            }`}
          >
            {roundTimeLeft}
          </span>
          <span className="text-[10px] font-semibold text-zinc-500">s</span>
        </div>
      </div>

      {/* Submit Button Green submitted, yellow judging, red not submitted */}
      <div className="flex items-center gap-2">
        <button
          className={`rounded-xs border px-6 py-1.5 text-sm font-semibold transition-colors ${
            isReconnecting
              ? "cursor-not-allowed border-zinc-700 bg-zinc-900 text-zinc-200/30"
              : codeStatus === "submitted"
                ? "cursor-not-allowed border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : codeStatus === "judging"
                  ? "cursor-not-allowed border-[#ffd687]/30 bg-zinc-800 text-[#ffd687]"
                  : codeStatus === "processing"
                    ? "cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-200"
                    : "cursor-pointer border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          }`}
          onClick={onSubmit}
          disabled={
            codeStatus === "submitted" ||
            codeStatus === "judging" ||
            codeStatus === "processing" ||
            isReconnecting
          }
        >
          {isReconnecting
            ? "Reconnecting..."
            : codeStatus === "submitted"
              ? "Submitted"
              : codeStatus === "judging"
                ? "Judging..."
                : "Submit"}
        </button>
        {/* Spinning wheel while the code is being judged/processed */}
        {isProcessing && (
          <LoaderCircle
            size={16}
            className="shrink-0 animate-spin text-[#ffd687]"
          />
        )}
      </div>

      <div className="relative w-20">
        <button
          className="w-full cursor-pointer rounded-xs border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          onClick={handleOpenModal}
        >
          Players
        </button>

        {/* Modal for displaying submitted players */}
        {showModal && (
          <>
            {/* Invisible overlay so clicking anywhere outside the dropdown closes it */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowModal(false)}
            />
            <div className="absolute top-full right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-xs border border-zinc-800 bg-zinc-900 p-3 shadow-xl">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Players
                </h2>
                <span className="text-[11px] font-medium text-zinc-500">
                  {playerList.length}
                </span>
              </div>
              {/* List out players, put an icon next to them for submtited or judging or not submitted */}
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {playerList.map((player) => {
                  const showUsernameSubline =
                    player.displayName &&
                    player.username &&
                    player.displayName !== player.username;

                  return (
                    <div
                      key={player.username}
                      className="flex items-center justify-between gap-3 rounded-xs px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">
                          {player.displayName || player.username}
                        </p>
                        {showUsernameSubline && (
                          <p className="truncate text-[11px] text-zinc-500">
                            {player.username}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                          player.codeStatus === "submitted"
                            ? "text-emerald-400"
                            : player.codeStatus === "judging"
                              ? "text-[#ffd687]"
                              : "text-rose-400"
                        }`}
                      >
                        {player.codeStatus === "submitted"
                          ? "Submitted"
                          : player.codeStatus === "judging"
                            ? "Judging"
                            : "Not Submitted"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameNavbar;
