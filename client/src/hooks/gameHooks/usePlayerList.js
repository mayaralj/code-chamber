// Custom hook to handle player list updates
import { useState, useEffect } from "react";
import { socket } from "../../socket";

// Custom hook to handle player list updates
const usePlayerList = (players, newRoundPayload) => {
  // States
  const [playerList, setPlayerList] = useState(players || []);
  // Handle new round payload to update player list
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setPlayerList(newRoundPayload?.players || []);
  }

  // Handle results (only update player list here)
  useEffect(() => {
    const handleResults = ({ players }) => {
      setPlayerList(players);
    };
    socket.on("send-results", handleResults);

    return () => {
      socket.off("send-results", handleResults);
    };
  }, []);

  useEffect(() => {
    const handleUpdatePlayers = ({ players }) => {
      setPlayerList(players);
    };

    // Listen for player list update
    socket.on("update-players", handleUpdatePlayers);

    // Cleanup
    return () => {
      socket.off("update-players", handleUpdatePlayers);
    };
  }, []);

  return { playerList, setPlayerList };
};

export default usePlayerList;
