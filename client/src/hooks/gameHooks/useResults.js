// Custom hook to handle game results and related states
import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";

// Custom hook to handle game results and related states
const useResults = (newRoundPayload) => {
  // States
  const [results, setResults] = useState([]);
  const [processingResults, setProcessingResults] = useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
  const [missedPlayer, setMissedPlayer] = useState(null);
  const [isMissed, setIsMissed] = useState(false);
  const [winner, setWinner] = useState(null);
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setResults([]);
    setResultsReady(false);
    setMissedPlayer(null);
    setEliminatedPlayers([]);
    setWinner(null);
    setIsMissed(false);
    setProcessingResults(false);
  }
  useEffect(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, [newRoundPayload]);

  // refs
  const cleanupRef = useRef(null);

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
    const handleResults = ({ results, eliminatedPlayers, missedPlayer }) => {
      setResults(results || []);
      setResultsReady(true);
      setMissedPlayer(missedPlayer);
      setEliminatedPlayers(eliminatedPlayers || []);
      setProcessingResults(false);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };

    // Handle Results
    socket.on("send-results", handleResults);

    const handleGameOver = ({ results, eliminatedPlayers, winner }) => {
      setResults(results || []);
      setResultsReady(true);
      setMissedPlayer(null);
      setEliminatedPlayers(eliminatedPlayers || []);
      setWinner(winner);
      setProcessingResults(false);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };

    // Game over connections
    socket.on("game-over", handleGameOver);

    // Process results if not already processing
    socket.on("processing-results", () => {
      setProcessingResults(true);
    });

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      socket.off("send-results", handleResults);
      socket.off("game-over", handleGameOver);
      socket.off("processing-results");
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
    processingResults,
  };
};

export default useResults;
