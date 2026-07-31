// context/SessionStabilityProvider.jsx
import { useState } from "react";
import authClient from "../authClient";
import StableSessionContext from "./StableSessionContext";

export const StableSessionProvider = ({ children }) => {
  const { data: session, isPending } = authClient.useSession();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  if (!hasLoadedOnce && !isPending) {
    setHasLoadedOnce(true);
  }

  return (
    <StableSessionContext.Provider
      value={{ session, isPending: isPending && !hasLoadedOnce }}
    >
      {children}
    </StableSessionContext.Provider>
  );
};

export default StableSessionProvider;
