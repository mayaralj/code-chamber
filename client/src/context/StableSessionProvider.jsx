import { useState } from "react";
import authClient from "../authClient";
import StableSessionContext from "./StableSessionContext";

export const StableSessionProvider = ({ children }) => {
  const { data: session, isPending, error } = authClient.useSession();

  const [prevIsPending, setPrevIsPending] = useState(isPending);
  const [stableSession, setStableSession] = useState(session);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  if (isPending !== prevIsPending) {
    setPrevIsPending(isPending);
    if (!isPending) {
      setStableSession(session);
      setHasLoadedOnce(true);
    }
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
