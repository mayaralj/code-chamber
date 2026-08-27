// Imports
import { socket } from "../../socket";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";

// Custom hook to handle reconnection
const useReconnection = (code, setPlayerList, setters) => {
  // Navigate
  const navigate = useNavigate();

  // Get all the setters
  const {
    setCurrentRound,
    setBeforeRoundEvents,
    setQuestion,
    setStarterCode,
    setCodeStatus,
    setTimerEndsAt,
    setTimerFinished,
    setRoundEndsAt,
    setTimeMultiplier,
    setResults,
    setResultsReady,
    setEliminatedPlayers,
    setMissedPlayer,
    setWinner,
  } = setters;

  // Refs
  const toastIdRef = useRef(null);

  // Reconnection sockets
  useEffect(() => {
    // Handle reconnect success and failure
    socket.once("reconnect-game-success", (reconnectData) => {
      // Update the base regardless of phase
      const { phase } = reconnectData;
      setPlayerList(reconnectData.players);
      setCurrentRound(reconnectData.curRound);
      setBeforeRoundEvents(reconnectData.beforeRoundEvents);
      setQuestion(reconnectData.question);
      setStarterCode(reconnectData.question.starterCode);
      setCodeStatus(reconnectData.codeStatus);

      // Handle phase specific updates
      switch (phase) {
        case "countdown":
        case "game-started":
        case "new-round":
          // Update ends at
          setTimerEndsAt(reconnectData.endsAt);
          break;
        case "round-tick":
          // Disable countdown timer and update round timer
          setTimerFinished(true);
          setTimerEndsAt(null);
          // Update round timer
          setRoundEndsAt(reconnectData.roundEndsAt);
          setTimeMultiplier(reconnectData.timeMultiplier);
          break;
        case "results":
          setResults(reconnectData.results);
          setResultsReady(true);
          setEliminatedPlayers(reconnectData.eliminatedPlayers);
          setMissedPlayer(reconnectData.missedPlayer);
          setWinner(reconnectData.winner);
          break;
      }
    });
    socket.once("reconnect-failure", () => {
      navigate("/browse", { replace: true });
    });

    // On connection, attempt to reconnect to game
    socket.on("connect", () => {
      socket.emit("reconnect-game", { code });
    });

    // On waiting-for-reconnect, show toast notification
    socket.on("waiting-for-reconnect", () => {
      toastIdRef.current = toast.error("Waiting for players to reconnect...", {
        duration: 1000000,
      });
    });

    // Players reconnected
    socket.on("players-reconnected", ({ players }) => {
      setPlayerList(players);
      toast.dismiss(toastIdRef.current);
    });

    // Cleanup
    return () => {
      socket.off("reconnect-success");
      socket.off("reconnect-failure");
      socket.off("waiting-for-reconnect");
      socket.off("players-reconnected");
    };
  }, []);
};

export default useReconnection;
