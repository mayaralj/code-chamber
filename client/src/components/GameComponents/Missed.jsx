import { useEffect, useState } from "react";
import { UserX } from "lucide-react";

// How long to show the missed screen before it transitions out and hides
const REDIRECT_SECONDS = 4;

// Component to show when a player is missed (spared) this round
const Missed = ({ setMissed }) => {
  // States
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [isExiting, setIsExiting] = useState(false);

  if (secondsLeft <= 0 && !isExiting) {
    setIsExiting(true);
  }

  // Count down once per second, starting the exit transition once it hits zero
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [secondsLeft]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-6 text-center">
      <style>{`
        @keyframes missed-fade-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes missed-fade-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-10px) scale(0.97); }
        }
      `}</style>

      <div
        onAnimationEnd={() => {
          if (isExiting) setMissed(false);
        }}
        className={`flex flex-col items-center gap-4 ${
          isExiting
            ? "animate-[missed-fade-out_0.4s_ease-in_forwards]"
            : "animate-[missed-fade-in_0.75s_ease-out]"
        }`}
      >
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#ffd687]/30 bg-[#ffd687]/10">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffd687]/10" />
          <UserX size={24} className="relative text-[#ffd687]" />
        </div>

        <h1 className="text-3xl font-black text-zinc-100">
          You've been spared.
        </h1>
        <p className="max-w-sm text-sm text-zinc-400">
          The match continues with you.
        </p>
      </div>
    </div>
  );
};

export default Missed;
