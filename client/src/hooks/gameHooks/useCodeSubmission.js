import { useState, useEffect, useRef } from "react";
import socket from "../../socket";

export const useCodeSubmission = (code, players) => {
  const [codeInput, setCodeInput] = useState("");
  const codeInputRef = useRef("");
  useEffect(() => {
    codeInputRef.current = codeInput;
  }, [codeInput]);

  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const hasSubmitted = useRef(false);

  const [language, setLanguage] = useState("javascript");
  const languageRef = useRef("javascript");
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const [playersList, setPlayersList] = useState(
    players?.map((player) => ({ ...player, submitted: false })) || [],
  );

  const handleSubmit = () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    const timeSubmitted = Date.now();

    socket.emit("submit-code", {
      code,
      codeInput: codeInputRef.current,
      language,
      timeSubmitted,
    });
  };

  const handleLanguageChange = (e) => {
    if (hasSubmitted.current) return;
    setLanguage(e.target.value);
  };

  useEffect(() => {
    socket.on("submitted-players", ({ submittedPlayers }) => {
      setPlayersList((prev) =>
        prev.map((player) => ({
          ...player,
          submitted: submittedPlayers.includes(player.username),
        })),
      );
    });

    socket.on("code-submitted", () => {
      setCodeSubmitted(true);
      hasSubmitted.current = true;
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
    setCodeInput,
    codeSubmitted,
    language,
    handleSubmit,
    handleLanguageChange,
    playersList,
  };
};
