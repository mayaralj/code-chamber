// Imports
import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

// Round Timer
const useRoundTimer = (
  initRoundEndsAt,
  initTimeMultiplier,
  newRoundPayload,
) => {
  // States
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [timeMultiplier, setTimeMultiplier] = useState(initTimeMultiplier);
  const [roundEndsAt, setRoundEndsAt] = useState(initRoundEndsAt);
  const [currentRound, setCurrentRound] = useState(1);
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setCurrentRound(newRoundPayload?.currentRound);
    setRoundTimeLeft(0);
  }

  // Refs
  const roundTimerCleanupRef = useRef(null);

  // If initial roundEndsAt and multiplier are provided, start the timer
  useEffect(() => {
    if (roundEndsAt && timeMultiplier) {
      // Cleanup prev
      if (roundTimerCleanupRef.current) {
        roundTimerCleanupRef.current();
      }
      // Start new timer
      roundTimerCleanupRef.current = playAnyTimer({
        endsAt: roundEndsAt,
        functionSetter: setRoundTimeLeft,
        timeMultiplier,
      });
    }
  }, [roundEndsAt, timeMultiplier]);

  useEffect(() => {
    socket.on("round-tick", ({ roundEndsAt, timeMultiplier }) => {
      console.log(`Received round-tick with endsAt: ${roundEndsAt}`);
      // Game timer tick
      setRoundEndsAt(roundEndsAt);
      setTimeMultiplier(timeMultiplier);
    });

    // Game timer finished
    socket.on("round-timer-finished", () => {
      setRoundTimeLeft(0);
      // Cleanup timer
      if (roundTimerCleanupRef.current) {
        roundTimerCleanupRef.current();
        roundTimerCleanupRef.current = null;
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off("round-tick");
      socket.off("round-timer-finished");
      if (roundTimerCleanupRef.current) {
        roundTimerCleanupRef.current();
        roundTimerCleanupRef.current = null;
      }
    };
  }, []);

  return {
    roundTimeLeft,
    currentRound,
    setCurrentRound,
    setRoundEndsAt,
    setTimeMultiplier,
  };
};

export default useRoundTimer;
