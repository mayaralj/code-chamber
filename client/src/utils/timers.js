// Helper function to play timer with given end time
export const playAnyTimer = ({ endsAt, functionSetter }) => {
  let lastSecond = -1;
  // Countdown timer tick
  const interval = setInterval(() => {
    const now = Date.now();
    const timeLeft = Math.max(0, Math.round((endsAt - now) / 1000));

    if (timeLeft !== lastSecond) {
      console.log("Timer tick:", timeLeft);
      lastSecond = timeLeft;
      functionSetter(timeLeft);
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
  }, 100);

  // Cleanup function to clear interval if component unmounts or timer is stopped
  return () => clearInterval(interval);
};
