// Imports
import { useState } from "react";

// Custom hook to handle game question and starter code
const useGameQuestion = (initQuestion, newRoundPayload) => {
  // States
  const [question, setQuestion] = useState(initQuestion || null);
  const [starterCode, setStarterCode] = useState(
    initQuestion?.starterCode || "",
  );
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setQuestion(newRoundPayload?.question || null);
    setStarterCode(newRoundPayload?.question?.starterCode || "");
  }

  return { question, setQuestion, starterCode, setStarterCode };
};

export default useGameQuestion;
