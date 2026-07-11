import { useState, useEffect, useRef } from "react";
import socket from "../../socket";

// Import timer utils
import { playAnyTimer } from "../../utils/timers.js";

// Round Timer
export const useRoundTimer = () => {
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [roundTimerFinished, setRoundTimerFinished] = useState(false);
  const roundTimerCleanupRef = useRef(null);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = () => {
      setRoundTimeLeft(0);
      setRoundTimerFinished(false);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  useEffect(() => {
    socket.on("round-tick", ({ roundEndsAt, fasterTimer }) => {
      console.log(`Received round-tick with endsAt: ${roundEndsAt}`);
      // Game timer tick
      setRoundTimerFinished(false);
      roundTimerCleanupRef.current = playAnyTimer({
        endsAt: roundEndsAt,
        functionSetter: setRoundTimeLeft,
        fasterTimer: fasterTimer,
      });
    });

    // Game timer finished
    socket.on("round-timer-finished", () => {
      setRoundTimerFinished(true);
      if (roundTimerCleanupRef.current) {
        roundTimerCleanupRef.current();
        roundTimerCleanupRef.current = null;
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off("round-tick");
      socket.off("round-timer-finished");
    };
  }, []);

  return { roundTimeLeft };
};
