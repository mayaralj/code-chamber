// Imports
import { useState, useEffect } from "react";
import { socket } from "../../socket";

// Status Events
const useStatusEvents = () => {
  // States
  const [statusEvents, setStatusEvents] = useState([
    // Initial with game started and round 1 started
    { type: "game", message: "Game started" },
    { type: "round", message: "Round 1 started" },
  ]);

  // Handle eliminated and missed players from results
  useEffect(() => {
    const handleStatusResults = ({ eliminatedPlayers, missedPlayer }) => {
      console.log(
        "Received results with eliminatedPlayers:",
        eliminatedPlayers,
        "and missedPlayer:",
        missedPlayer,
      );
      // Add eliminated players to status events
      if (eliminatedPlayers && eliminatedPlayers.length > 0) {
        eliminatedPlayers.forEach((player) => {
          setStatusEvents((prevEvents) => [
            ...prevEvents,
            {
              type: "eliminated",
              message: `${player} was eliminated`,
            },
          ]);
        });
      }

      // Add missed player to status events
      if (missedPlayer) {
        setStatusEvents((prevEvents) => [
          ...prevEvents,
          {
            type: "missed",
            message: `${missedPlayer} was spared this round`,
          },
        ]);
      }
    };

    // Listen for results from server
    socket.on("send-results", handleStatusResults);
    // Game over connections
    socket.on("game-over", handleStatusResults);

    // Cleanup
    return () => {
      socket.off("send-results", handleStatusResults);
      socket.off("game-over", handleStatusResults);
    };
  }, []);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ currentRound }) => {
      setStatusEvents((prevEvents) => [
        ...prevEvents,
        {
          type: "round",
          message: `Round ${currentRound} started`,
        },
      ]);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Listen for player submitted events
  useEffect(() => {
    const handlePlayerSubmitted = ({ playerSubmitted }) => {
      console.log(`Player ${playerSubmitted.username} submitted code`);
      setStatusEvents((prevEvents) => [
        ...prevEvents,
        {
          type: "submitted",
          message: `${playerSubmitted.username} submitted`,
        },
      ]);
    };

    // Listen for player submitted event
    socket.on("player-submitted", handlePlayerSubmitted);

    // Cleanup
    return () => {
      socket.off("player-submitted", handlePlayerSubmitted);
    };
  }, []);

  // Listen for player left (disconnected) events
  useEffect(() => {
    const handlePlayerLeave = ({ playerLeft }) => {
      console.log(`Player ${playerLeft.username} disconnected`);
      setStatusEvents((prevEvents) => [
        ...prevEvents,
        {
          type: "disconnected",
          message: `${playerLeft.username} disconnected`,
        },
      ]);
    };

    // Listen for player left event
    socket.on("player-left", handlePlayerLeave);

    // Cleanup
    return () => {
      socket.off("player-left", handlePlayerLeave);
    };
  }, []);

  // Return
  return { statusEvents };
};

export default useStatusEvents;
