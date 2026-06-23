// Import from react
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
// Import socket
import socket from "../socket";
// Import from components
import Question from "../components/GameComponents/Question";
import CodeEditor from "../components/GameComponents/CodeEditor";
import Timer from "../components/GameComponents/Timer";
import Results from "../components/GameComponents/Results";
// Navbar
import GameNavbar from "../components/GameComponents/GameNavbar";
// Hooks
import { useCountdownTimer } from "../hooks/gameHooks/useCountdownTimer";
import { useRoundTimer } from "../hooks/gameHooks/useRoundTimer";
import { useGameQuestion } from "../hooks/gameHooks/useGameQuestion";
import { useCodeSubmission } from "../hooks/gameHooks/useCodeSubmission";
import { useResults } from "../hooks/gameHooks/useResults";

const Game = () => {
  // Game Code
  const { code } = useParams();
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
  const { timeLeft, timerFinished } = useCountdownTimer(initEndsAt);
  // Round Timer
  const { roundTimeLeft } = useRoundTimer();
  // Question
  const { question, starterCode } = useGameQuestion(initQuestion);
  // Code Submission
  const {
    setCodeInput,
    codeSubmitted,
    isJudging,
    language,
    handleSubmit,
    handleLanguageChange,
    playersList,
  } = useCodeSubmission(code, players);
  // Editor Ready
  const [editorReady, setEditorReady] = useState(false);
  // Results
  const { results, resultsReady, playerEliminated } = useResults(code);

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

  // Kick them out on player eliminated
  useEffect(() => {
    socket.once("player-eliminated", () => {
      console.log("You have been eliminated, redirecting to home");
      navigate("/", { replace: true });
    });

    return () => {
      socket.off("player-eliminated");
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
          isJudging={isJudging}
          onSubmit={handleSubmit}
          playersList={playersList}
          roundTimeLeft={roundTimeLeft}
        />
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <Question question={question} />
          <div className="w-0.5 bg-white"></div>
          <CodeEditor
            onChange={setCodeInput}
            isJudging={isJudging}
            language={language}
            onLanguageChange={handleLanguageChange}
            onMount={() => setEditorReady(true)}
            starterCode={starterCode}
          />
        </div>

        {/* Show Results if ready */}
        {resultsReady && (
          <Results results={results} playerEliminated={playerEliminated} />
        )}
      </div>

      {/* Show timer until ready */}
      {(!timerFinished || !editorReady) && <Timer timeLeft={timeLeft} />}
    </>
  );
};

export default Game;
