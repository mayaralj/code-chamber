import { useState, useEffect } from "react";
import socket from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

export const useResults = () => {
  const [results, setResults] = useState(null);
  const [resultsTimer, setResultsTimer] = useState(null);
  const [resultsReady, setResultsReady] = useState(false);

  // Player Eliminated
  const [playerEliminated, setPlayerEliminated] = useState(null);

  // Winner
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    // Listen for results from server
    socket.on(
      "send-results",
      ({ results, resultsEndsAt, playerEliminated, winner }) => {
        setResults(results);
        setResultsReady(true);
        setPlayerEliminated(playerEliminated);
        if (winner) {
          console.log("Game over, winner:", winner);
          setWinner(winner);
        }
        playAnyTimer({
          endsAt: resultsEndsAt,
          functionSetter: setResultsTimer,
        });
      },
    );

    // Listen for results timer finished event
    socket.on("results-timer-finished", () => {
      setResultsReady(false);
    });

    // Cleanup on unmount
    return () => {
      socket.off("send-results");
      socket.off("results-timer-finished");
      socket.off("game-over");
    };
  }, []);

  return { results, resultsReady, playerEliminated, winner };
};
