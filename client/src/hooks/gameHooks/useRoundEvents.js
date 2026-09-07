// Imports
import { useState, useEffect } from "react";
import { socket } from "../../socket";

// Round Timer
const useRoundEvents = (firstBeforeEvents) => {
  // States
  const [beforeRoundEvents, setBeforeRoundEvents] = useState(firstBeforeEvents);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ beforeRoundEvents }) => {
      setBeforeRoundEvents(beforeRoundEvents);
    };

    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Return
  return { beforeRoundEvents, setBeforeRoundEvents };
};

export default useRoundEvents;
