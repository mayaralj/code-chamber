import { useState, useEffect } from "react";
import socket from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

export const useResults = () => {
  const [results, setResults] = useState(null);
  const [resultsTimer, setResultsTimer] = useState(null);
  const [resultsReady, setResultsReady] = useState(false);

  // Player Eliminated
  const [playerEliminated, setPlayerEliminated] = useState(null);

  useEffect(() => {
    socket.on(
      "send-results",
      ({ results, resultsEndsAt, playerEliminated }) => {
        setResults(results);
        setResultsReady(true);
        setPlayerEliminated(playerEliminated);
        playAnyTimer({
          endsAt: resultsEndsAt,
          functionSetter: setResultsTimer,
        });
      },
    );

    socket.on("results-timer-finished", () => {
      setResultsReady(false);
    });

    return () => {
      socket.off("send-results");
      socket.off("results-timer-finished");
    };
  }, []);

  return { results, resultsReady, playerEliminated };
};
