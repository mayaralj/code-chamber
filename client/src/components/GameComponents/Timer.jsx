// COnvert beforeRoundEvents to a more readable format
const cleanEventMap = {
  fasterTimer: "Faster Timer",
  doubleElimination: "Double Elimination",
};

const Timer = ({ timeLeft, currentRound, beforeRoundEvents }) => {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b0b0b] font-mono text-[#e7c49d] select-none pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(#5b4e3e 0.55px, transparent 0.55px)",
        backgroundSize: "20px 20px",
      }}
    >
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8c09d]">
        Round {currentRound}
      </h2>
      <h1 className="text-7xl font-black tracking-tight text-[#ffdd9d]">
        {timeLeft}
      </h1>
      {beforeRoundEvents && (
        <div className="mt-2 w-full max-w-sm border border-[#4b4133] bg-[#111111] p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#a9977e]">
            Bonus Events
          </h2>
          <ul className="space-y-2">
            {Object.keys(beforeRoundEvents).map((eventName) => (
              <li
                key={eventName}
                className="border-l-2 border-[#ffdd9d] pl-3 text-sm text-[#e7c49d]"
              >
                {cleanEventMap[eventName]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Timer;
