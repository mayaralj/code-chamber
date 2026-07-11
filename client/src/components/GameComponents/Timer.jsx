const Timer = ({ timeLeft, beforeRoundEvents }) => {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center select-none pointer-events-none">
      <h1 className="text-6xl font-bold">{timeLeft}</h1>
      {beforeRoundEvents && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Before Round Events:</h2>
          <ul>
            {Object.keys(beforeRoundEvents).map((eventName) => (
              <li key={eventName} className="text-lg">
                {eventName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Timer;
