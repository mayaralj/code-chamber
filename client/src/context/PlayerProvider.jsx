import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import router from "../router";
import PlayerContext from "./PlayerContext";
import toast from "react-hot-toast";

// COnfig
const SERVER_SHUTDOWN_TIMEOUT = 5000;

// Player provider
const PlayerProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const hasConnectedOnceRef = useRef(false);
  const serverDownTimerRef = useRef(null);

  useEffect(() => {
    const clearServerDownTimer = () => {
      if (serverDownTimerRef.current) {
        clearTimeout(serverDownTimerRef.current);
        serverDownTimerRef.current = null;
      }
    };

    const startServerDownTimer = () => {
      // Check if already
      if (serverDownTimerRef.current) {
        return;
      }
      serverDownTimerRef.current = setTimeout(() => {
        setConnectionStatus("server-down");
        //router.navigate("/", { replace: true });
        // Show toast notification
        toast.error("GAME SERVER IS DOWN", {
          duration: 5000,
          position: "top-right",
        });
      }, SERVER_SHUTDOWN_TIMEOUT);
    };

    const setIdentity = (identity) => {
      clearServerDownTimer();
      setPlayer(identity);
      setConnectionStatus("connected");
    };

    const onConnect = () => {
      clearServerDownTimer();
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
      startServerDownTimer();
      setConnectionStatus(
        hasConnectedOnceRef.current ? "reconnecting" : "disconnected",
      );
    };

    const onReconnectAttempt = () => {
      startServerDownTimer();
    };

    socket.on("user-data", setIdentity);
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    socket.connect();

    return () => {
      socket.off("user-data", setIdentity);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
      clearServerDownTimer();
      socket.disconnect();
    };
  }, []);

  return (
    <PlayerContext.Provider value={{ player, connectionStatus }}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerProvider;
