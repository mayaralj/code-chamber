// ServerHealthProvider.jsx
import { useState, useEffect, useRef } from "react";
import ServerHealthContext from "./ServerHealthContext";

// Config
const SERVER_HEALTH_CHECK_URL = "http://localhost:5000/api/health";
const SERVER_HEALTH_CHECK_INTERVAL = 10000;
const SERVER_UNREACHABLE_TIMEOUT = 10000;

// ServerHealthProvider component
const ServerHealthProvider = ({ children }) => {
  // States
  const [serverUnreachable, setServerUnreachable] = useState(false);

  // Refs
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
        const response = await fetch(SERVER_HEALTH_CHECK_URL, {
          method: "GET",
          signal: combinedSignal,
        });
        if (response.ok) {
          setServerUnreachable(false);
        } else {
          setServerUnreachable(true);
        }
      } catch (error) {
        // Ignore abort errors, but set server unreachable for other errors
        if (error.name !== "AbortError") {
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
