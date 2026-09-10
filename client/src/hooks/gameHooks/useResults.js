// Custom hook to handle game results and related states
import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

// Custom hook to handle game results and related states
const useResults = () => {
  // States
  const [results, setResults] = useState([]);
  const [resultsTimer, setResultsTimer] = useState(null);
  const [resultsReady, setResultsReady] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [missedPlayer, setMissedPlayer] = useState(null);
  const [isMissed, setIsMissed] = useState(false);
  const [winner, setWinner] = useState(null);

  // refs
  const cleanupRef = useRef(null);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = () => {
      setResults([]);
      setResultsTimer(null);
      setResultsReady(false);
      setMissedPlayer(null);
      setEliminatedPlayers([]);
      setWinner(null);
      setIsMissed(false);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Handle missed player event
  useEffect(() => {
    const handleIsMissed = () => {
      setIsMissed(true);
    };
    socket.on("player-missed", handleIsMissed);

    // Cleanup
    return () => {
      socket.off("player-missed", handleIsMissed);
    };
  }, []);

  useEffect(() => {
    // Listen for results from server
    const handleResults = ({
      results,
      resultsEndsAt,
      eliminatedPlayers,
      missedPlayer,
    }) => {
      console.log("Results received from server:");
      setResults(results || []);
      setResultsReady(true);
      setMissedPlayer(missedPlayer);
      setEliminatedPlayers(eliminatedPlayers || []);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = playAnyTimer({
        endsAt: resultsEndsAt || Date.now() + 5000,
        functionSetter: setResultsTimer,
      });
    };

    // Handle Results
    socket.on("send-results", handleResults);

    // Listen for results timer finished event
    socket.on("results-timer-finished", () => {
      console.log("Results timer finished event received from server");
      setResultsReady(false);
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    });

    const handleGameOver = ({
      results,
      gameOverEndsAt,
      eliminatedPlayers,
      winner,
    }) => {
      console.log("Game over received from server:", {
        gameOverEndsAt,
        eliminatedPlayers,
        winner,
      });
      setResults(results || []);
      setResultsReady(true);
      setMissedPlayer(null);
      setEliminatedPlayers(eliminatedPlayers || []);
      setWinner(winner);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = playAnyTimer({
        endsAt: gameOverEndsAt || Date.now() + 8000,
        functionSetter: setResultsTimer,
      });
    };

    // Game over connections
    socket.on("game-over", handleGameOver);

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      socket.off("send-results", handleResults);
      socket.off("results-timer-finished");
      socket.off("game-over", handleGameOver);
    };
  }, []);

  return {
    results,
    setResults,
    resultsReady,
    setResultsReady,
    eliminatedPlayers,
    setEliminatedPlayers,
    setMissedPlayer,
    missedPlayer,
    isMissed,
    setIsMissed,
    winner,
    setWinner,
  };
};

export default useResults;
