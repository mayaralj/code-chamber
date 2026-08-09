// Imports
import { socket } from "../../socket";
import { useEffect } from "react";

// Disconnection hook
const useDisconnection = (code, roomDeletedRef) => {
  // Disconnection
  useEffect(() => {
    return () => {
      if (roomDeletedRef.current) {
        console.log("Disconnection: Room deleted, not leaving game");
        return;
      }
      console.log("Disconnection: Player leaving game");
      socket.emit("leave-game", { code });
    };
  }, [code, roomDeletedRef]);
};

export default useDisconnection;
