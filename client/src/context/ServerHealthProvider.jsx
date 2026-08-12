// ServerHealthProvider.jsx
import { useState, useEffect } from "react";
import ServerHealthContext from "./ServerHealthContext";

// Config
const SERVER_HEALTH_CHECK_URL = "http://localhost:5000/api/health";
const SERVER_HEALTH_CHECK_INTERVAL = 10000;

const ServerHealthProvider = ({ children }) => {
  const [serverUnreachable, setServerUnreachable] = useState(false);

  // Constantly check server health
  useEffect(() => {
    const checkServer = async () => {
      try {
        await fetch(SERVER_HEALTH_CHECK_URL, { method: "GET" });
        setServerUnreachable(false);
      } catch {
        setServerUnreachable(true);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, SERVER_HEALTH_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <ServerHealthContext.Provider value={{ serverUnreachable }}>
      {children}
    </ServerHealthContext.Provider>
  );
};

export default ServerHealthProvider;
