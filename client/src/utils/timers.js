// Helper function to play timer with given end time
export const playAnyTimer = ({ endsAt, functionSetter, fasterTimer = 1 }) => {
  let lastSecond = -1;
  let interval;

  // Track the starting duration and the time when the timer started
  const startingDuration = endsAt - Date.now();
  const startedAt = Date.now();

  // Countdown timer tick
  const tick = () => {
    const now = Date.now();
    // Calculate elapsed time and adjust for faster timer multiplier
    const elapsedMs = (now - startedAt) * fasterTimer;
    const timeLeft = Math.max(
      0,
      Math.ceil((startingDuration - elapsedMs) / 1000),
    );

    if (timeLeft !== lastSecond) {
      console.log("Timer tick:", timeLeft);
      lastSecond = timeLeft;
      functionSetter(timeLeft);
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
  };

  // Start the timer
  tick(); // Initial tick to set the state immediately
  interval = setInterval(tick, 100);

  // Cleanup function to clear interval if component unmounts or timer is stopped
  return () => clearInterval(interval);
};
