// Imports
import { useState } from "react";

// Round Timer
const useRoundEvents = (firstBeforeEvents, newRoundPayload) => {
  // States
  const [beforeRoundEvents, setBeforeRoundEvents] = useState(firstBeforeEvents);
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setBeforeRoundEvents(newRoundPayload?.beforeRoundEvents || []);
  }

  // Return
  return { beforeRoundEvents, setBeforeRoundEvents };
};

export default useRoundEvents;
