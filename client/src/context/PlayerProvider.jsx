import { useState, useEffect } from "react";
import { socket } from "../socket";
import PlayerContext from "./PlayerContext";

const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    const setIdentity = (identity) => {
      console.log("Received identity:", identity);
      setPlayer(identity);
      setConnectionStatus("connected");
    };

    const onConnect = () => {
      console.log("Connected:", socket.id);
      setPlayer(null);
      setConnectionStatus("connecting");
    };

    const onConnectError = (error) => {
      console.error("Socket connection error:", error.message);
      if (!socket.active) {
        setPlayer(null);
        setConnectionStatus("error");
      }
    };

    const onDisconnect = (reason) => {
      console.log("Socket disconnected:", reason);
      setPlayer(null);
      setConnectionStatus("disconnected");
    };

    // Add Listeners for socket events
    socket.on("user-data", setIdentity);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

    // Attempt to connect the socket
    socket.connect();

    return () => {
      socket.off("user-data", setIdentity);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <PlayerContext.Provider value={{ player, connectionStatus }}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerProvider;
