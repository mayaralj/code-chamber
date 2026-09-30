// Imports
import { useState, useEffect } from "react";
import LiveStatsContext from "./LiveStatsContext.js";

// Config
const LIVE_STATS_URL = `${import.meta.env.VITE_APP_URL}/api/liveStats`;

// Live stats provider
const LiveStatsProvider = ({ children }) => {
  const [liveStats, setLiveStats] = useState(null);

  // Helper to check if all live stats fields are present and valid
  const hasAllLiveStatsFields = (stats) => {
    const requiredFields = [
      "active_users",
      "total_matches",
      "total_submissions",
      "avg_pass_rate",
      "avg_execution_time",
      "avg_submission_time",
      "most_used_language",
      "most_used_difficulty",
      "avg_survival_time",
      "avg_match_time",
    ];

    return requiredFields.every(
      (field) => stats[field] !== undefined && stats[field] !== null,
    );
  };

  // Handle live stats connection
  useEffect(() => {
    const source = new EventSource(LIVE_STATS_URL);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (hasAllLiveStatsFields(data)) {
          setLiveStats(data);
        }
      } catch {
        console.error("Invalid JSON data received:", event.data);
      }
    };

    source.onerror = (error) => {
      console.error("Live stats connection error:", error);
    };

    return () => {
      source.close();
    };
  }, []);

  return (
    <LiveStatsContext.Provider value={{ liveStats }}>
      {children}
    </LiveStatsContext.Provider>
  );
};

export default LiveStatsProvider;
