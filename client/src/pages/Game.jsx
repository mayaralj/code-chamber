import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import socket from "../socket";
// Import from components
import Question from "../components/GameComponents/Question";
import CodeEditor from "../components/GameComponents/CodeEditor";
import Timer from "../components/GameComponents/Timer";
// Navbar
import GameNavbar from "../components/GameComponents/GameNavbar";

const Game = () => {
  // Game Code
  const { code } = useParams();
  console.log("Game component rendered with code:", code);

  // Get Info passed from RoomWait
  const location = useLocation();
  const { username, players } = location.state || {};
  const navigate = useNavigate();

  // Timer
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(false);
  console.log("Game component rendered with timeLeft:", timeLeft);

  // Question
  const [question, setQuestion] = useState(null);

  // Code
  const [codeInput, setCodeInput] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);

  // Editor Language
  const [language, setLanguage] = useState("javascript");

  // Players list, submitted or not state
  const [playersList, setPlayersList] = useState(
    players?.map((player) => ({ ...player, submitted: false })) || [],
  );

  // Check with server if user is supposed to be here
  // useEffect(() => {
  //   socket.emit("check-room", { code });
  //   socket.once("check-room-response", ({ valid }) => {
  //     if (!valid) {
  //       console.log("User not valid for this room, redirecting to home");
  //       navigate("/", { replace: true });
  //     }
  //   });
  // }, []);

  // Listen for timer ticks and game start
  useEffect(() => {
    socket.on("timer-tick", ({ timeLeft }) => {
      console.log("Timer tick:", timeLeft);
      setTimeLeft(timeLeft);
    });

    socket.on("timer-finished", () => {
      setTimerFinished(true);
    });

    // Cleanup
    return () => {
      socket.off("timer-tick");
      socket.off("timer-finished");
      socket.emit("leave-room", { code });
    };
  }, []);

  // Get the next Question from server
  useEffect(() => {
    // Grab it before timer is actually finished so its ready when timer is finished
    if (timerFinished) {
      return;
    }

    socket.emit("get-question", { code });
    socket.once("send-question", ({ question }) => {
      setQuestion(question);
    });
    socket.once("question-error", ({ message }) => {
      console.error("Error getting question:", message);
    });

    // Cleanup
    return () => {
      socket.off("send-question");
      socket.off("question-error");
    };
  }, [timerFinished]);

  // State check
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, []);
  if (!location.state) return null;

  // Functions
  // handleSubmit
  const handleSubmit = () => {
    // Emit code submission event to server
    console.log("Submitting code:", codeInput);
    socket.emit("submit-code", { code, codeInput, language });
    socket.once("code-submitted", ({ submittedPlayers }) => {
      // Update players list with submitted status
      setPlayersList((prev) =>
        prev.map((player) => ({
          ...player,
          submitted: submittedPlayers.includes(player.username),
        })),
      );
    });

    // Handle error
    socket.once("submit-code-error", ({ message }) => {
      console.error("Error submitting code:", message);
    });

    // Set code submitted to true to disable editor and submit button
    setCodeSubmitted(true);
  };

  // language change
  const handleLanguageChange = (e) => {
    // Check if submitted, if so do not allow language change
    if (codeSubmitted) {
      return;
    }
    setLanguage(e.target.value);
  };

  return (
    <div className="flex flex-col h-screen">
      {timerFinished && (
        <GameNavbar
          isSubmitted={codeSubmitted}
          onSubmit={handleSubmit}
          playersList={playersList}
        />
      )}
      {timerFinished ? (
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <Question question={question} />
          <div className="w-0.5 bg-white"></div>
          <CodeEditor
            onChange={setCodeInput}
            codeSubmitted={codeSubmitted}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      ) : (
        <Timer timeLeft={timeLeft} />
      )}
    </div>
  );
};

export default Game;
