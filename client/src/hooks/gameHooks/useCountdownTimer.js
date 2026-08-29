// Imports
import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

// Custom hook to handle countdown timer
const useCountdownTimer = (initEndsAt) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(() =>
    Boolean(initEndsAt && initEndsAt > Date.now() ? false : true),
  );
  const [timerEndsAt, setTimerEndsAt] = useState(initEndsAt);

  // Cleanup ref
  const cleanupRef = useRef(null);

  // On time left at 0 automatically set timer finished to true
  if (timeLeft === 0 && !timerFinished) {
    setTimerFinished(true);
  }

  // On time endsAt change, start the timer
  useEffect(() => {
    if (timerEndsAt && timerEndsAt > Date.now()) {
      // Cleanup prev
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      // Start new timer
      cleanupRef.current = playAnyTimer({
        endsAt: timerEndsAt,
        functionSetter: setTimeLeft,
      });
    }
  }, [timerEndsAt]);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ newEndsAt }) => {
      setTimerFinished(false);
      setTimerEndsAt(newEndsAt);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  useEffect(() => {
    // Listen for timer finished event
    socket.on("timer-finished", () => {
      console.log("Timer finished event received from server");
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
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return { timeLeft, timerFinished, setTimerFinished, setTimerEndsAt };
};

export default useCountdownTimer;
