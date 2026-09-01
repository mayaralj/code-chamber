// Imports
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { socket } from "../../socket";
import toast from "react-hot-toast";

// Custom hook to handle player leaves
const usePlayerLeave = (code, setPlayerList, roomDeletedRef, timerFinished) => {
  const navigate = useNavigate();

  // States
  const [isEliminated, setIsEliminated] = useState(false);

  // Refs
  const toastIdRef = useRef(null);

  // Player left
  useEffect(() => {
    // Helper to show the player-left toast with correct positioning
    const showPlayerLeftToast = (playerLeft) => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = toast(`${playerLeft.username} has left the game`, {
        style: timerFinished ? {} : { marginTop: "-40px" },
      });
    };

    // Handle player left event
    const handlePlayerLeft = ({ playerLeft, players }) => {
      showPlayerLeftToast(playerLeft);
      setPlayerList(players);
    };

    socket.on("player-left", handlePlayerLeft);

    return () => {
      socket.off("player-left", handlePlayerLeft);
    };
  }, [setPlayerList, timerFinished]);

  // Handle leaving game on page unload
  useEffect(() => {
    const handleUnload = () => {
      socket.emit("leave-game", { code });
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [code]);

  // Kick them out on player eliminated
  useEffect(() => {
    socket.once("player-eliminated", () => {
      setIsEliminated(true);
    });

    return () => {
      socket.off("player-eliminated");
    };
  }, [navigate]);

  // Room Deletion
  useEffect(() => {
    socket.once("room-deleted", ({ message }) => {
      roomDeletedRef.current = true;
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      if (message === "Game over") {
        toast("Game Over", { icon: "🏆" });
      } else {
        toastIdRef.current = toast.error(message);
      }
      navigate("/browse", { replace: true });
    });

    return () => {
      socket.off("room-deleted");
    };
  }, [navigate, roomDeletedRef]);

  // Game error
  useEffect(() => {
    socket.once("game-error", ({ message }) => {
      console.error("Game error:", message);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = toast.error(message);
      navigate("/browse", { replace: true });
    });

    return () => {
      socket.off("game-error");
    };
  }, [navigate]);

  return { isEliminated };
};

export default usePlayerLeave;
