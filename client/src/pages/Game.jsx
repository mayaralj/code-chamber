import { useEffect, useState, useRef } from "react";
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
  const { username, players, endsAt: initEndsAt } = location.state || {};
  const navigate = useNavigate();

  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(false);
  console.log("Game component rendered with timeLeft:", timeLeft);

  // Game Timer
  const [gameTimeLeft, setGameTimeLeft] = useState(30);
  const [gameTimerFinished, setGameTimerFinished] = useState(false);

  // Question
  const [question, setQuestion] = useState(null);

  // Code
  const [codeInput, setCodeInput] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const hasSubmitted = useRef(false);

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

  // Helper function to play timer with given end time
  const playAnyTimer = ({ endsAt, functionSetter }) => {
    let lastSecond = -1;
    // Countdown timer tick
    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.round((endsAt - now) / 1000));

      if (timeLeft !== lastSecond) {
        console.log("Timer tick:", timeLeft);
        lastSecond = timeLeft;
        functionSetter(timeLeft);
      }

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }
    }, 100);
  };

  // handleSubmit
  const handleSubmit = () => {
    if (hasSubmitted.current) {
      return;
    }
    hasSubmitted.current = true;

    // Emit code submission event to server
    console.log("Submitting code:", codeInput);
    socket.emit("submit-code", { code, codeInput, language });
  };

  // language change
  const handleLanguageChange = (e) => {
    // Check if submitted, if so do not allow language change
    if (hasSubmitted.current) {
      return;
    }
    setLanguage(e.target.value);
  };

  // Listen for timer ticks
  useEffect(() => {
    // Ensure an end time was provided
    if (!initEndsAt) {
      console.error("No initEndsAt provided in location state");
      return;
    }

    // Play initial timer (round 1)
    playAnyTimer({ endsAt: initEndsAt, functionSetter: setTimeLeft });
    // Play timer for future rounds
    socket.on("timer-tick", ({ newEndsAt }) => {
      setTimerFinished(false);
      playAnyTimer({ endsAt: newEndsAt, functionSetter: setTimeLeft });
    });

    // On timer finished
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

  // Game Timer
  useEffect(() => {
    socket.on("game-tick", ({ gameTimerEndsAt }) => {
      // Game timer tick
      setGameTimerFinished(false);
      playAnyTimer({
        endsAt: gameTimerEndsAt,
        functionSetter: setGameTimeLeft,
      });
    });

    socket.on("game-timer-finished", () => {
      setGameTimerFinished(true);
    });
  }, []);

  // Code Submission
  useEffect(() => {
    // Submitted Players
    socket.on("submitted-players", ({ submittedPlayers }) => {
      // Update players list with submitted status
      setPlayersList((prev) =>
        prev.map((player) => ({
          ...player,
          submitted: submittedPlayers.includes(player.username),
        })),
      );
    });

    // Code Submit
    socket.on("code-submitted", () => {
      setCodeSubmitted(true);
      hasSubmitted.current = true;
    });

    // Code Submit Handle error
    socket.once("submit-code-error", ({ message }) => {
      console.error("Error submitting code:", message);
    });
    // Cleanup
    return () => {
      socket.off("submitted-players");
      socket.off("code-submitted");
      socket.off("submit-code-error");
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

  return (
    <div className="flex flex-col h-screen">
      {timerFinished && (
        <GameNavbar
          isSubmitted={codeSubmitted}
          onSubmit={handleSubmit}
          playersList={playersList}
          gameTimeLeft={gameTimeLeft}
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
