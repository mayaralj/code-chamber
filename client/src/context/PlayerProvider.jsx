import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import PlayerContext from "./PlayerContext";

const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    const setIdentity = (identity) => {
      setPlayer(identity);
      setConnectionStatus("connected");
    };

    const onConnect = () => {
      hasConnectedOnceRef.current = true;
      // player identity set by user-data shortly after
    };

    const onConnectError = () => {
      if (!socket.active) {
        setPlayer(null);
        setConnectionStatus(
          hasConnectedOnceRef.current ? "reconnecting" : "error",
        );
      }
    };

    const onDisconnect = () => {
      setConnectionStatus(
        hasConnectedOnceRef.current ? "reconnecting" : "disconnected",
      );
    };

    socket.on("user-data", setIdentity);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

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
