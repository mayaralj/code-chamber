import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../../socket";

export const useCodeSubmission = (code) => {
  // Code input (ref because its faster to update + no need the actual state for any ui)
  const codeInputRef = useRef("");

  // Code submitted status
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isSubmittedRef = useRef(false);

  // Judging status
  const [isJudging, setIsJudging] = useState(false);
  const isJudgingRef = useRef(false);

  // Language
  const [language, setLanguage] = useState("javascript");
  const languageRef = useRef("javascript");

  // Handle code change updates to ref
  const handleCodeChange = useCallback((value) => {
    const nextCode = value ?? "";
    codeInputRef.current = nextCode;
  }, []);

  // Handle language change updates to both state and ref
  const handleLanguageChange = (e) => {
    if (isJudgingRef.current || isSubmittedRef.current) return;

    const nextLanguage = e.target.value;
    languageRef.current = nextLanguage;
    setLanguage(nextLanguage);
  };

  // Handle code submission
  const handleSubmit = () => {
    // If judging or submitted dont allow to emit again
    if (isSubmittedRef.current || isJudgingRef.current) return;
    // Set is judging right away so ui feels responsive
    isJudgingRef.current = true;
    setIsJudging(true);

    // This ref is only to prevent multiple emits, the actual state is set when the server responds with code-submitted
    isSubmittedRef.current = true;

    // Track time submitted now instead on server for more accuracy
    const timeSubmitted = Date.now();

    // Log the code
    console.log(`Submitting code for room ${code} at time ${timeSubmitted}:`, {
      codeInput: codeInputRef.current,
    });

    // Emit code submission to server
    socket.emit("submit-code", {
      code,
      codeInput: codeInputRef.current,
      language: languageRef.current,
      timeSubmitted,
    });
  };

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = () => {
      codeInputRef.current = "";

      isSubmittedRef.current = false;
      setIsSubmitted(false);

      isJudgingRef.current = false;
      setIsJudging(false);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Listen for submission updates and errors
  useEffect(() => {
    socket.on("code-submitted", () => {
      // Set is submitted to true
      setIsSubmitted(true);
      isSubmittedRef.current = true;

      // Set is judging to false
      setIsJudging(false);
      isJudgingRef.current = false;
    });

    socket.on("code-judging", () => {
      // Set is judging to true
      setIsJudging(true);
      isJudgingRef.current = true;
    });

    socket.on("request-current-code", () => {
      socket.emit("current-code", {
        codeInput: codeInputRef.current,
        language: languageRef.current,
      });
    });

    socket.once("submit-code-error", ({ message }) => {
      console.error("Error submitting code:", message);
    });

    return () => {
      socket.off("code-submitted");
      socket.off("submit-code-error");
      socket.off("request-current-code");
    };
  }, []);

  return {
    handleCodeChange,
    isSubmitted,
    isJudging,
    language,
    handleSubmit,
    handleLanguageChange,
  };
};
