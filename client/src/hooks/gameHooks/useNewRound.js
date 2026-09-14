// Imports
import { useState, useEffect } from "react";
import { socket } from "../../socket";

// Custom hook to handle game question and starter code
const useNewRound = () => {
  const [newRoundPayload, setNewRoundPayload] = useState(null);

  useEffect(() => {
    const handleNewRound = (payload) => setNewRoundPayload(payload);
    socket.on("new-round", handleNewRound);
    return () => socket.off("new-round", handleNewRound);
  }, []);

  return newRoundPayload;
};

export default useNewRound;
