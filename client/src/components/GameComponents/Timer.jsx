const Timer = ({ timeLeft }) => {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center select-none pointer-events-none">
      <h1 className="text-6xl font-bold">{timeLeft}</h1>
    </div>
  );
};

export default Timer;
