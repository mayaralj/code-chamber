// Imports
import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../../socket";

// Hook to handle code submission
const useCodeSubmission = (code, setPlayerList, newRoundPayload) => {
  // Code input (ref because its faster to update + no need the actual state for any ui)
  const [codeInput, setCodeInput] = useState(""); // only used to reset the code input on new round
  const codeInputRef = useRef("");

  // Code status
  const [codeStatus, setCodeStatus] = useState("not-submitted");
  const codeStatusRef = useRef("not-submitted");

  // Test cases results
  const [testCasesResults, setTestCasesResults] = useState([]);

  // Language
  const [language, setLanguage] = useState("javascript");
  const languageRef = useRef("javascript");

  // Handle new round payload to reset states
  const [appliedPayLoad, setAppliedPayLoad] = useState(null);
  if (newRoundPayload && newRoundPayload !== appliedPayLoad) {
    setAppliedPayLoad(newRoundPayload);
    setCodeStatus("not-submitted");
    setCodeInput("");
    setTestCasesResults([]);
  }

  // On code input update the ref
  useEffect(() => {
    codeInputRef.current = codeInput;
  }, [codeInput]);

  // On code status update the ref
  useEffect(() => {
    codeStatusRef.current = codeStatus;
  }, [codeStatus]);

  // Handle code change updates to ref
  const handleCodeChange = useCallback((value) => {
    const nextCode = value ?? "";
    codeInputRef.current = nextCode;
  }, []);

  // Handle language change updates to both state and ref
  const handleLanguageChange = (nextLanguage) => {
    if (
      codeStatusRef.current === "submitted" ||
      codeStatusRef.current === "judging" ||
      codeStatusRef.current === "processing"
    )
      return;

    languageRef.current = nextLanguage;
    setLanguage(nextLanguage);
  };

  // Handle code submission
  const handleSubmit = () => {
    // If judging or submitted dont allow to emit again
    if (
      codeStatusRef.current === "submitted" ||
      codeStatusRef.current === "judging" ||
      codeStatusRef.current === "processing"
    )
      return;

    // Set processing right away
    codeStatusRef.current = "processing";
    setCodeStatus("processing");

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

  // Listen for submission updates and errors
  useEffect(() => {
    socket.on("code-submitted", (testCasesResults) => {
      // Set is submitted to true
      setCodeStatus("submitted");

      // Set test cases results
      setTestCasesResults(testCasesResults);
    });

    socket.on("code-judging", () => {
      // Set is judging to true
      setCodeStatus("judging");
    });

    socket.on("request-code", (data, callback) => {
      console.log(`Server requested current code for room ${code}`);
      callback({
        codeInput: codeInputRef.current,
        language: languageRef.current,
      });
    });

    socket.once("submit-code-error", ({ message }) => {
      console.error("Error submitting code:", message);
      // Reset is submitted and is judging to false
      setCodeStatus("not-submitted");
      codeStatusRef.current = "not-submitted";
    });

    return () => {
      socket.off("code-judging");
      socket.off("code-submitted");
      socket.off("submit-code-error");
      socket.off("request-code");
    };
  }, []);

  // Handle someone else submitted
  useEffect(() => {
    const handlePlayerSubmitted = ({ players }) => {
      setPlayerList(players);
    };

    socket.on("player-submitted", handlePlayerSubmitted);

    return () => {
      socket.off("player-submitted", handlePlayerSubmitted);
    };
  }, [code, setPlayerList]);

  return {
    handleCodeChange,
    codeStatus,
    setCodeStatus,
    language,
    handleSubmit,
    handleLanguageChange,
    testCasesResults,
  };
};

export default useCodeSubmission;
