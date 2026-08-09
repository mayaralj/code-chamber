// Imports
import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

// Round Timer
const useRoundTimer = (initRoundEndsAt, initTimeMultiplier) => {
  // States
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [roundTimerFinished, setRoundTimerFinished] = useState(false);
  const [timeMultiplier, setTimeMultiplier] = useState(initTimeMultiplier);
  const [roundEndsAt, setRoundEndsAt] = useState(initRoundEndsAt);
  const [currentRound, setCurrentRound] = useState(1);

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

  // Handle new round start by resetting states
  useEffect(() => {
    // Handle new round event
    const handleNewRound = ({ currentRound }) => {
      setCurrentRound(currentRound);
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
    socket.on("round-tick", ({ roundEndsAt, timeMultiplier }) => {
      console.log(`Received round-tick with endsAt: ${roundEndsAt}`);
      // Game timer tick
      setRoundTimerFinished(false);
      setRoundEndsAt(roundEndsAt);
      setTimeMultiplier(timeMultiplier);
    });

    // Game timer finished
    socket.on("round-timer-finished", () => {
      setRoundTimerFinished(true);
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
