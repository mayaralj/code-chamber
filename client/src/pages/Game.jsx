import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import socket from "../socket";
// Import from components
import Question from "../components/GameComponents/Question";
import CodeEditor from "../components/GameComponents/CodeEditor";
import Timer from "../components/GameComponents/Timer";
import Results from "../components/GameComponents/Results";
// Navbar
import GameNavbar from "../components/GameComponents/GameNavbar";

const Game = () => {
  // Game Code
  const { code } = useParams();
  console.log("Game component rendered with code:", code);

  // Get Info passed from RoomWait
  const location = useLocation();
  const {
    username,
    players,
    endsAt: initEndsAt,
    question: initQuestion,
  } = location.state || {};
  const navigate = useNavigate();

  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(false);
  console.log("Game component rendered with timeLeft:", timeLeft);

  // Game Timer
  const [roundTimeLeft, setRoundTimeLeft] = useState(30);
  const [roundTimerFinished, setRoundTimerFinished] = useState(false);
  const roundTimerCleanupRef = useRef(null);

  // Question
  const [question, setQuestion] = useState(initQuestion || null);

  // Code
  const [codeInput, setCodeInput] = useState("");
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const hasSubmitted = useRef(false);

  // Editor Ready
  const [editorReady, setEditorReady] = useState(false);

  // Editor Language
  const [language, setLanguage] = useState("javascript");

  // Results
  const [results, setResults] = useState(null);
  const [resultsTimer, setResultsTimer] = useState(null);
  const [resultsReady, setResultsReady] = useState(false);

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

    // Cleanup function to clear interval if component unmounts or timer is stopped
    return () => clearInterval(interval);
  };

  // handleSubmit
  const handleSubmit = () => {
    if (hasSubmitted.current) {
      return;
    }
    hasSubmitted.current = true;

    // Time submitted
    const timeSubmitted = Date.now();

    // Emit code submission event to server
    console.log("Submitting code:", codeInput);
    socket.emit("submit-code", { code, codeInput, language, timeSubmitted });
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
    socket.on("round-tick", ({ roundTimerEndsAt }) => {
      // Game timer tick
      setRoundTimerFinished(false);
      roundTimerCleanupRef.current = playAnyTimer({
        endsAt: roundTimerEndsAt,
        functionSetter: setRoundTimeLeft,
      });
    });

    // Game timer finished
    socket.on("round-timer-finished", () => {
      setRoundTimerFinished(true);
      if (roundTimerCleanupRef.current) {
        roundTimerCleanupRef.current();
        roundTimerCleanupRef.current = null;
      }
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

  // Get the Question from server
  useEffect(() => {
    socket.on("send-question", ({ question }) => {
      setQuestion(question);
    });

    // Cleanup
    return () => {
      socket.off("send-question");
    };
  }, []);

  // Results
  useEffect(() => {
    socket.on("send-results", ({ results, resultsEndsAt }) => {
      console.log("Received results");
      setResults(results);
      setResultsReady(true);
      playAnyTimer({
        endsAt: resultsEndsAt,
        functionSetter: setResultsTimer,
      });
    });

    // Results timer finished
    socket.on("results-timer-finished", () => {
      console.log("Results timer finished");
      setResultsReady(false);
    });

    // Cleanup
    return () => {
      socket.off("send-results");
      socket.off("results-timer-finished");
    };
  }, []);

  // Disconnection
  useEffect(() => {
    return () => {
      console.log("Game component unmounting, leaving room");
      socket.emit("game-leave-room", { code });
    };
  }, []);

  // State check
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, []);
  if (!location.state) return null;

  return (
    <>
      {/* Always render editor, just hide it */}
      <div
        className={
          timerFinished && editorReady
            ? "flex flex-col h-screen relative"
            : "hidden"
        }
      >
        <GameNavbar
          isSubmitted={codeSubmitted}
          onSubmit={handleSubmit}
          playersList={playersList}
          roundTimeLeft={roundTimeLeft}
        />
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <Question question={question} />
          <div className="w-0.5 bg-white"></div>
          <CodeEditor
            onChange={setCodeInput}
            codeSubmitted={codeSubmitted}
            language={language}
            onLanguageChange={handleLanguageChange}
            onMount={() => setEditorReady(true)}
          />
        </div>

        {/* Show Results if ready */}
        {resultsReady && <Results results={results} />}
      </div>

      {/* Show timer until ready */}
      {(!timerFinished || !editorReady) && <Timer timeLeft={timeLeft} />}
    </>
  );
};

export default Game;
