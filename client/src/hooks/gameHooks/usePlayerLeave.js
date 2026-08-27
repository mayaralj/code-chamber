// Imports
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { socket } from "../../socket";
import toast from "react-hot-toast";

// Custom hook to handle player leaves
const usePlayerLeave = (code, setPlayerList, roomDeletedRef, timerFinished) => {
  const navigate = useNavigate();
  const toastIdRef = useRef(null);

  // Player left
  useEffect(() => {
    // Helper to show the player-left toast with correct positioning
    const showPlayerLeftToast = () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = toast("A player has left the game", {
        style: timerFinished ? {} : { marginTop: "-40px" },
      });
    };

    socket.on("player-left", ({ players }) => {
      showPlayerLeftToast();
      setPlayerList(players);
    });

    return () => {
      socket.off("player-left");
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
      navigate("/browse", { replace: true });
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
};

export default usePlayerLeave;
