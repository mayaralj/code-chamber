import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../../socket";

export const useCodeSubmission = (code, players) => {
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

  // Player list
  const [playerList, setPlayerList] = useState(players || []);

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

    // Emit code submission to server
    socket.emit("submit-code", {
      code,
      codeInput: codeInputRef.current,
      language: languageRef.current,
      timeSubmitted,
    });
  };

  // Handle results (only update player list here)
  useEffect(() => {
    const handleResults = ({ players }) => {
      setPlayerList(players);
    };
    socket.on("send-results", handleResults);

    return () => {
      socket.off("send-results", handleResults);
    };
  }, []);

  // Handle new round start by resetting states
  useEffect(() => {
    const handleNewRound = ({ players }) => {
      codeInputRef.current = "";

      isSubmittedRef.current = false;
      setIsSubmitted(false);

      isJudgingRef.current = false;
      setIsJudging(false);

      setPlayerList(players);
    };

    // Listen for new round event
    socket.on("new-round", handleNewRound);

    // Cleanup
    return () => {
      socket.off("new-round", handleNewRound);
    };
  }, []);

  // Listen for judging updates and errors
  useEffect(() => {
    socket.on("code-judging", () => {
      setIsJudging(true);
    });

    socket.on("judging-players", ({ players }) => {
      setPlayerList(players);
    });

    // Cleanup
    return () => {
      socket.off("code-judging");
      socket.off("judging-players");
    };
  }, []);

  // Listen for submission updates and errors
  useEffect(() => {
    socket.on("submitted-players", ({ players }) => {
      setPlayerList(players);
    });

    socket.on("code-submitted", () => {
      setIsSubmitted(true);
      setIsJudging(false);
      isSubmittedRef.current = true;
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
      socket.off("submitted-players");
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
    playerList,
    setPlayerList,
  };
};
