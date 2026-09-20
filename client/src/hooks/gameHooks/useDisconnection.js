// Imports
import { socket } from "../../socket";
import { useEffect } from "react";

// Disconnection hook
const useDisconnection = (code, roomDeletedRef) => {
  // Disconnection
  useEffect(() => {
    return () => {
      if (roomDeletedRef.current) {
        return;
      }
      socket.emit("leave-game", { code });
    };
  }, [code, roomDeletedRef]);
};

export default useDisconnection;
