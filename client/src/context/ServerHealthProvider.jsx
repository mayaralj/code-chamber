// ServerHealthProvider.jsx
import { useState, useEffect, useRef } from "react";
import ServerHealthContext from "./ServerHealthContext";
import { socket } from "../socket";

// Config
const SERVER_HEALTH_CHECK_URL = "http://localhost:5000/api/health";
const SERVER_HEALTH_CHECK_INTERVAL = 10000;
const SERVER_UNREACHABLE_TIMEOUT = 10000;

// ServerHealthProvider component
const ServerHealthProvider = ({ children }) => {
  // States
  const [serverUnreachable, setServerUnreachable] = useState(false);

  // Refs
  const wasServerUnreachableRef = useRef(false);
  const alreadyEmittedCleanupRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Constantly check server health
  useEffect(() => {
    // Abort controller to cancel fetch requests if the component unmounts
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Function to check server health
    const checkServer = async () => {
      try {
        const combinedSignal = AbortSignal.any([
          abortControllerRef.current.signal,
          AbortSignal.timeout(SERVER_UNREACHABLE_TIMEOUT),
        ]);
        await fetch(SERVER_HEALTH_CHECK_URL, {
          method: "GET",
          signal: combinedSignal,
        });
        // If server was unreachable before emit to cleanup player incase they are in a room while they are on a different page now
        if (
          wasServerUnreachableRef.current &&
          !alreadyEmittedCleanupRef.current
        ) {
          console.log("Server is back online, emitting cleanup-player");
          socket.emit("cleanup-player");
          alreadyEmittedCleanupRef.current = true;
        }
        wasServerUnreachableRef.current = false;
        setServerUnreachable(false);
      } catch (error) {
        // Ignore abort errors, but set server unreachable for other errors
        if (error.name !== "AbortError") {
          wasServerUnreachableRef.current = true;
          alreadyEmittedCleanupRef.current = false;
          setServerUnreachable(true);
        }
      }
    };

    checkServer();
    const interval = setInterval(checkServer, SERVER_HEALTH_CHECK_INTERVAL);
    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <ServerHealthContext.Provider value={{ serverUnreachable }}>
      {children}
    </ServerHealthContext.Provider>
  );
};

export default ServerHealthProvider;
