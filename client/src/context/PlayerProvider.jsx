import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";
import PlayerContext from "./PlayerContext";
import toast from "react-hot-toast";

// COnfig
const SERVER_SHUTDOWN_TIMEOUT = 100000;

// Player provider
const PlayerProvider = ({ children }) => {
  // States
  const [player, setPlayer] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  // Refs
  const connectionStatusRef = useRef(connectionStatus);
  const hasConnectedOnceRef = useRef(false);
  const serverDownTimerRef = useRef(null);
  const toastIdRef = useRef(null);

  // Update connectionStatusRef whenever connectionStatus changes
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  useEffect(() => {
    const clearServerDownTimer = () => {
      if (serverDownTimerRef.current) {
        clearTimeout(serverDownTimerRef.current);
        serverDownTimerRef.current = null;
      }
    };

    const startServerDownTimer = () => {
      // Check if already
      if (
        serverDownTimerRef.current ||
        connectionStatus === "lost-connection"
      ) {
        return;
      }
      serverDownTimerRef.current = setTimeout(() => {
        setConnectionStatus("lost-connection");
        //router.navigate("/", { replace: true });
        // Show toast notification
        toastIdRef.current = toast.error("Error: Lost Server Connection", {
          duration: 10000,
        });
      }, SERVER_SHUTDOWN_TIMEOUT);
    };

    const setIdentity = (identity) => {
      clearServerDownTimer();
      toast.dismiss(toastIdRef.current);

      // If was lost-connection, notify server to cleanup player
      if (connectionStatusRef.current === "lost-connection") {
        socket.emit("cleanup-player");
      }

      setPlayer(identity);
      setConnectionStatus("connected");
      // If guest, store guest id in localStorage
      if (identity.isGuest && localStorage.getItem("guestId") !== identity.id) {
        localStorage.setItem("guestId", identity.id);
      }
    };

    const onConnect = () => {
      clearServerDownTimer();
      toast.dismiss(toastIdRef.current);
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
