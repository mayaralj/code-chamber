import { useState, useEffect } from "react";
import { socket } from "../socket";
import PlayerContext from "./PlayerContext";

const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const setIdentity = (identity) => {
      console.log("Received identity:", identity);
      setPlayer(identity);
    };

    const onConnect = () => {
      console.log("Connected:", socket.id);
    };

    const onConnectError = (error) => {
      console.error("Socket connection error:", error.message);
    };

    // 1. Add listeners first
    socket.on("user-data", setIdentity);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);

    // 2. Then start the connection
    socket.connect();

    return () => {
      socket.off("user-data", setIdentity);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);

      // Optional: only if this provider is the sole socket owner
      // socket.disconnect();
    };
  }, []);

  return (
    <PlayerContext.Provider value={{ player, setPlayer }}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerProvider;
