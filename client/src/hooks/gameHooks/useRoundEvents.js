import { useState, useEffect } from "react";
import socket from "../../socket";

// Round Timer
export const useRoundEvents = (firstBeforeEvents) => {
  console.log(`useRoundEvents firstBeforeEvents: ${firstBeforeEvents}`);
  // Initial before round events (from game started)
  const [beforeRoundEvents, setBeforeRoundEvents] = useState(firstBeforeEvents);
  const [afterRoundEvents, setAfterRoundEvents] = useState(null);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ beforeRoundEvents }) => {
      setBeforeRoundEvents(beforeRoundEvents);
      setAfterRoundEvents(null);
    };

    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Return
  return { beforeRoundEvents, afterRoundEvents };
};
