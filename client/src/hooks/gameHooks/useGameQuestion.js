// Imports
import { useState, useEffect } from "react";
import socket from "../../socket";

export const useGameQuestion = (initQuestion) => {
  const [question, setQuestion] = useState(initQuestion || null);
  const [starterCode, setStarterCode] = useState(
    initQuestion?.starterCode || "",
  );

  // Get the Question from server
  useEffect(() => {
    socket.on("send-question", ({ question }) => {
      setQuestion(question);
      setStarterCode(question.starterCode);
    });

    // Cleanup
    return () => {
      socket.off("send-question");
    };
  }, []);
  return { question, starterCode };
};
