import { useState, useEffect } from "react";
import socket from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

export const useResults = () => {
  const [results, setResults] = useState(null);
  const [resultsTimer, setResultsTimer] = useState(null);
  const [resultsReady, setResultsReady] = useState(false);
  // Cleanup ref
  const cleanupRef = useState(null);

  // Player Eliminated
  const [playerEliminated, setPlayerEliminated] = useState(null);
  // Missed Player
  const [missedPlayer, setMissedPlayer] = useState(null);

  // Winner
  const [winner, setWinner] = useState(null);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = () => {
      setResults(null);
      setResultsTimer(null);
      setResultsReady(false);
      setPlayerEliminated(null);
      setWinner(null);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  useEffect(() => {
    // Listen for results from server
    const handleResults = ({
      results,
      resultsEndsAt,
      playerEliminated,
      missedPlayer,
    }) => {
      console.log(
        `Received results from server: ${JSON.stringify(results)}, player eliminated: ${playerEliminated}, missed player: ${missedPlayer}, resultsEndsAt: ${resultsEndsAt}`,
      );
      setResults(results);
      setResultsReady(true);
      setMissedPlayer(missedPlayer);
      setPlayerEliminated(playerEliminated);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = playAnyTimer({
        endsAt: resultsEndsAt,
        functionSetter: setResultsTimer,
      });
    };

    // Handle Results
    socket.on("send-results", handleResults);

    // Listen for results timer finished event
    socket.on("results-timer-finished", () => {
      setResultsReady(false);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    });

    // Game over connections
    socket.on(
      "game-over",
      ({ results, gameOverEndsAt, playerEliminated, winner }) => {
        console.log(
          `Received game over from server: ${JSON.stringify(
            results,
          )}, player eliminated: ${playerEliminated}, winner: ${winner}, gameOverEndsAt: ${gameOverEndsAt}`,
        );
        setResults(results);
        setResultsReady(true);
        setPlayerEliminated(playerEliminated);
        setWinner(winner);
        if (cleanupRef.current) {
          cleanupRef.current();
        }
        cleanupRef.current = playAnyTimer({
          endsAt: gameOverEndsAt,
          functionSetter: setResultsTimer,
        });
      },
    );

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      socket.off("send-results", handleResults);
      socket.off("results-timer-finished");
      socket.off("game-over");
    };
  }, []);

  return { results, resultsReady, playerEliminated, missedPlayer, winner };
};
