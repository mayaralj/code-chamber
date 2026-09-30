// Imports
import { useState, useEffect, useRef, useCallback } from "react";
import authClient from "../authClient";
import StableSessionContext from "./StableSessionContext";
import useServerHealth from "../hooks/useServerHealth";

// Config
const RETRY_BASE_DELAY = 1500;
const RETRY_MAX_DELAY = 10000;
const DEGRADED_AFTER_ATTEMPTS = 6;

export const StableSessionProvider = ({ children }) => {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  // Track server health
  const { serverUnreachable } = useServerHealth();
  const wasUnreachable = useRef(serverUnreachable);

  // Suppress guard ref
  const suppressGuardRef = useRef(false);

  // Safely refetch
  const isRefetchingRef = useRef(false);
  const safeRefetch = useCallback(async () => {
    if (isRefetchingRef.current) return;
    isRefetchingRef.current = true;
    try {
      await refetch();
    } finally {
      isRefetchingRef.current = false;
    }
  }, [refetch]);

  const [prevIsPending, setPrevIsPending] = useState(isPending);
  const [stableSession, setStableSession] = useState(session);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    if (!error) return;

    let attempt = 0;
    let cancelled = false;

    const retryLoop = async () => {
      while (!cancelled) {
        const delay = Math.min(
          RETRY_BASE_DELAY * 2 ** attempt,
          RETRY_MAX_DELAY,
        );
        await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        attempt++;
        setAttemptCount(attempt);
        await safeRefetch();
      }
    };

    retryLoop();
    return () => {
      cancelled = true;
      setAttemptCount(0);
    };
  }, [error, safeRefetch]);

  // Derive persistentError based on error and attemptCount
  const persistentError =
    Boolean(error) && attemptCount >= DEGRADED_AFTER_ATTEMPTS;

  useEffect(() => {
    if (
      hasLoadedOnce &&
      localStorage.getItem("wasLoggedIn") !== (stableSession ? "true" : "false")
    ) {
      localStorage.setItem("wasLoggedIn", stableSession ? "true" : "false");
    }
  }, [hasLoadedOnce, stableSession]);

  // Refetch session if server becomes reachable again
  useEffect(() => {
    if (wasUnreachable.current && !serverUnreachable) {
      safeRefetch();
    }
    wasUnreachable.current = serverUnreachable;
  }, [serverUnreachable, safeRefetch]);

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
        persistentError,
        suppressGuardRef,
      }}
    >
      {children}
    </StableSessionContext.Provider>
  );
};

export default StableSessionProvider;
