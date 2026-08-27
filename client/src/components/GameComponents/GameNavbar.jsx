import { useState } from "react";

const GameNavbar = ({
  isSubmitted,
  isJudging,
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

  return (
    <div className="relative flex w-full items-center justify-between border-b border-zinc-800 bg-[#080812] px-7 py-2.5">
      {/* Timer On the very left side */}
      <div className="w-20 text-lg font-bold tabular-nums text-[#dfbb96] select-none pointer-events-none">
        {roundTimeLeft}
      </div>

      {/* Submit Button Green submitted, yellow judging, red not submitted */}
      <button
        className={`rounded-md border px-6 py-1.5 text-sm font-semibold transition-colors ${
          isSubmitted
            ? "cursor-not-allowed border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : isJudging
              ? "cursor-not-allowed border-[#ffd687]/30 bg-[#2d2d2d] text-[#ffd687]"
              : "cursor-pointer border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
        }`}
        onClick={onSubmit}
        disabled={isSubmitted || isJudging || isReconnecting}
      >
        {isReconnecting
          ? "Reconnecting..."
          : isSubmitted
            ? "Submitted"
            : isJudging
              ? "Judging..."
              : "Submit"}
      </button>

      {/* Button to display submitted players, wrapped in a relative container so the
          dropdown below can anchor to it instead of being positioned via click coordinates */}
      <div className="relative w-20">
        <button
          className="w-full cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
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
            <div className="absolute top-full right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-3 shadow-xl">
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
                {playerList.map((player) => (
                  <div
                    key={player.username}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800/60"
                  >
                    <span className="truncate">{player.username}</span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
                        player.submitted
                          ? "text-emerald-400"
                          : player.judging
                            ? "text-[#ffd687]"
                            : "text-rose-400"
                      }`}
                    >
                      {player.submitted
                        ? "Submitted"
                        : player.judging
                          ? "Judging"
                          : "Not Submitted"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameNavbar;
