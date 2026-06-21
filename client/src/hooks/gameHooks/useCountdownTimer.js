import { useState, useEffect } from "react";
import socket from "../../socket";

// Import timer utils
import { playAnyTimer } from "../../utils/timers.js";

export const useCountdownTimer = (initEndsAt) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(false);

  useEffect(() => {
    if (!initEndsAt) return;

    playAnyTimer({ endsAt: initEndsAt, functionSetter: setTimeLeft });

    socket.on("timer-tick", ({ newEndsAt }) => {
      setTimerFinished(false);
      playAnyTimer({ endsAt: newEndsAt, functionSetter: setTimeLeft });
    });

    socket.on("timer-finished", () => setTimerFinished(true));

    return () => {
      socket.off("timer-tick");
      socket.off("timer-finished");
    };
  }, []);

  return { timeLeft, timerFinished };
};
