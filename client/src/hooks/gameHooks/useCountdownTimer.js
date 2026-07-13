import { useState, useEffect } from "react";
import socket from "../../socket";

// Import timer utils
import { playAnyTimer } from "../../utils/timers.js";

export const useCountdownTimer = (initEndsAt) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(false);
  // Cleanup ref
  const cleanupRef = useState(null);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ newEndsAt }) => {
      setTimerFinished(false);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = playAnyTimer({
        endsAt: newEndsAt,
        functionSetter: setTimeLeft,
      });
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  useEffect(() => {
    // Play initial ends at (happens only when game started)
    if (!initEndsAt) return;
    playAnyTimer({ endsAt: initEndsAt, functionSetter: setTimeLeft });

    // Listen for timer finished event
    socket.on("timer-finished", () => {
      setTimerFinished(true);
      setTimeLeft(0);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off("timer-finished");
    };
  }, []);

  return { timeLeft, timerFinished };
};
