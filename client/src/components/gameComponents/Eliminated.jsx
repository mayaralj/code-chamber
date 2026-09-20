import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { UserX } from "lucide-react";

// How long to show the elimination screen before auto-redirecting
const REDIRECT_SECONDS = 20;

// Component to show when a player is eliminated
const Eliminated = () => {
  // Navigate
  const navigate = useNavigate();

  // States
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  // Count down once per second, redirecting once it hits zero
  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate("/browse", { replace: true });
      return;
    }
    const timeoutId = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [navigate, secondsLeft]);

  const progress = (secondsLeft / REDIRECT_SECONDS) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-6 text-center">
      <style>{`
        @keyframes eliminated-fade-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="flex animate-[eliminated-fade-in_1s_ease-out] flex-col items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/10" />
          <UserX size={24} className="relative text-rose-400" />
        </div>

        <h1 className="text-3xl font-black text-zinc-100">
          You've been eliminated
        </h1>
        <p className="max-w-sm text-sm text-zinc-400">
          The match continues without you. Head back to browse other rooms and
          challenge yourself once more.
        </p>
      </div>

      <div className="flex animate-[eliminated-fade-in_2s_ease-out] flex-col items-center gap-3">
        <button
          onClick={() => navigate("/browse", { replace: true })}
          className="cursor-pointer rounded-xs border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          Back to Browse
        </button>

        <div className="flex w-44 flex-col items-center gap-1.5">
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-[#ffd687] transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-zinc-500">
            Redirecting in {secondsLeft}s
          </span>
        </div>
      </div>
    </div>
  );
};

export default Eliminated;
