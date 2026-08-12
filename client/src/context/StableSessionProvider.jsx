import { useState, useEffect, useRef } from "react";
import authClient from "../authClient";
import StableSessionContext from "./StableSessionContext";
import useServerHealth from "../hooks/useServerHealth";

export const StableSessionProvider = ({ children }) => {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  // Track server health
  const { serverUnreachable } = useServerHealth();
  const wasUnreachable = useRef(serverUnreachable);

  const [prevIsPending, setPrevIsPending] = useState(isPending);
  const [stableSession, setStableSession] = useState(session);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Refetch session if server becomes reachable again
  useEffect(() => {
    if (wasUnreachable.current && !serverUnreachable) {
      console.log("Server became reachable again, refetching session...");
      refetch();
    }
    wasUnreachable.current = serverUnreachable;
  }, [serverUnreachable, refetch]);

  if (isPending !== prevIsPending) {
    setPrevIsPending(isPending);
    if (!isPending) {
      if (!error) {
        setStableSession(session);
      }
      setHasLoadedOnce(true);
    }
  } else if (!isPending && !error && session !== stableSession) {
    setStableSession(session);
  }

  return (
    <StableSessionContext.Provider
      value={{
        session: hasLoadedOnce ? stableSession : session,
        isPending: !hasLoadedOnce && isPending,
        error,
      }}
    >
      {children}
    </StableSessionContext.Provider>
  );
};

export default StableSessionProvider;
