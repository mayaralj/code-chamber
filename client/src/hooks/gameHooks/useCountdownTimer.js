// Imports
import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

// Custom hook to handle countdown timer
const useCountdownTimer = (initEndsAt, newRoundPayload) => {
  // States
  const [timeLeft, setTimeLeft] = useState(() =>
    initEndsAt && initEndsAt > Date.now() ? 5 : 0,
  );
  const [timerFinished, setTimerFinished] = useState(() =>
    Boolean(initEndsAt && initEndsAt > Date.now() ? false : true),
  );
  const [timerEndsAt, setTimerEndsAt] = useState(initEndsAt);
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setTimerEndsAt(newRoundPayload?.newEndsAt);
    setTimeLeft(5);
    setTimerFinished(false);
  }

  // Refs
  const cleanupRef = useRef(null);

  // On time left at 0 automatically set timer finished to true
  if (timeLeft === 0 && !timerFinished) {
    setTimerFinished(true);
  }

  // On time endsAt change, start the timer
  useEffect(() => {
    // Cleanup prev
    if (cleanupRef.current) {
      cleanupRef.current();
    }
    if (timerEndsAt && timerEndsAt > Date.now()) {
      // Start new timer
      cleanupRef.current = playAnyTimer({
        endsAt: timerEndsAt,
        functionSetter: setTimeLeft,
      });
    }

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [timerEndsAt]);

  useEffect(() => {
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

  return { timeLeft, timerFinished, setTimerFinished, setTimerEndsAt };
};

export default useCountdownTimer;
