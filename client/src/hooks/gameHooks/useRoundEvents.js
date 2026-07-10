import { useState, useEffect, useRef } from "react";
import socket from "../../socket";

// Import timer utils
import { playAnyTimer } from "../../utils/timers.js";

// Round Timer
export const useRoundEvents = (firstBeforeEvents) => {
  const [beforeRoundEvents, setBeforeRoundEvents] = useState(firstBeforeEvents);
  const [afterRoundEvents, setAfterRoundEvents] = useState(null);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = () => {
      setBeforeRoundEvents(null);
      setAfterRoundEvents(null);
    };

    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  });

  // Listen for events
  useEffect(() => {
    socket.on("before-round-events", ({ beforeRoundEvents }) => {
      console.log(
        `Received before-round-events: ${JSON.stringify(beforeRoundEvents)}`,
      );
      setBeforeRoundEvents(beforeRoundEvents);
    });

    socket.on("after-round-events", ({ afterRoundEvents }) => {
      console.log(
        `Received after-round-events: ${JSON.stringify(afterRoundEvents)}`,
      );
      setAfterRoundEvents(afterRoundEvents);
    });

    // Cleanup
    return () => {
      socket.off("before-round-events");
      socket.off("after-round-events");
    };
  }, []);

  // Return
  return { beforeRoundEvents, afterRoundEvents };
};
