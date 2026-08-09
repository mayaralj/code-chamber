// Custom hook to handle player list updates
import { useState, useEffect } from "react";
import { socket } from "../../socket";

// Custom hook to handle player list updates
const usePlayerList = (players) => {
  // Player list
  const [playerList, setPlayerList] = useState(players || []);

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

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ players }) => {
      setPlayerList(players);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Listen for submission updates and errors
  useEffect(() => {
    // Listen for player list update
    socket.on("update-players", ({ players }) => {
      setPlayerList(players);
    });

    // Cleanup
    return () => {
      socket.off("update-players");
    };
  }, []);

  return { playerList, setPlayerList };
};

export default usePlayerList;
