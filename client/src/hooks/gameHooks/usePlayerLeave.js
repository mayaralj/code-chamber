// Imports
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { socket } from "../../socket";
import toast from "react-hot-toast";

// Custom hook to handle player leaves
const usePlayerLeave = (code, setPlayerList, roomDeletedRef) => {
  // Navigate
  const navigate = useNavigate();
  console.log("usePlayerLeave initialized with code:", code);

  // Player left
  useEffect(() => {
    socket.on("player-left", ({ players }) => {
      // Update players list
      toast("A player has left the game");
      console.log("Player left, updating player list:", players);
      setPlayerList(players);
    });

    // Cleanup
    return () => {
      socket.off("player-left");
    };
  }, []);

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
  }, []);

  // Room Deletion
  useEffect(() => {
    socket.once("room-deleted", () => {
      roomDeletedRef.current = true;
      toast.error("Room has been deleted");
      navigate("/browse", { replace: true });
    });

    return () => {
      socket.off("room-deleted");
    };
  }, []);

  // Game error
  useEffect(() => {
    socket.once("game-error", ({ message }) => {
      console.error("Game error:", message);
      toast.error(message);
      navigate("/browse", { replace: true });
    });

    return () => {
      socket.off("game-error");
    };
  }, []);
};

export default usePlayerLeave;
