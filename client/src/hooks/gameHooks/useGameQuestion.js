// Imports
import { useState, useEffect } from "react";
import socket from "../../socket";

export const useGameQuestion = (initQuestion) => {
  const [question, setQuestion] = useState(initQuestion || null);
  const [starterCode, setStarterCode] = useState(
    initQuestion?.starterCode || "",
  );

  // Handle new round start by setting new question and starter code
  useEffect(() => {
    const handleNewRound = ({ question }) => {
      setQuestion(question);
      setStarterCode(question.starterCode);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  return { question, starterCode };
};
