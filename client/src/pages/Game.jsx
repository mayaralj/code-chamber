// Imports
import { useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { socket } from "../socket";
import Question from "../components/GameComponents/Question";
import CodeEditor from "../components/GameComponents/CodeEditor";
import Timer from "../components/GameComponents/Timer";
import Results from "../components/GameComponents/Results";
import GameNavbar from "../components/GameComponents/GameNavbar";
import useCountdownTimer from "../hooks/gameHooks/useCountdownTimer";
import useRoundTimer from "../hooks/gameHooks/useRoundTimer";
import useGameQuestion from "../hooks/gameHooks/useGameQuestion";
import useCodeSubmission from "../hooks/gameHooks/useCodeSubmission";
import useResults from "../hooks/gameHooks/useResults";
import useCodeEditor from "../hooks/gameHooks/useCodeEditor";
import useRoundEvents from "../hooks/gameHooks/useRoundEvents";
import usePlayerList from "../hooks/gameHooks/usePlayerList";
import usePlayerLeave from "../hooks/gameHooks/usePlayerLeave";
import useReconnection from "../hooks/gameHooks/useReconnection";
import useDisconnection from "../hooks/gameHooks/useDisconnection";
import usePlayer from "../hooks/usePlayer";

// Game component
const Game = () => {
  // Game Code
  const { code } = useParams();

  // Get Info passed from RoomWait
  const location = useLocation();
  const {
    players,
    endsAt: initEndsAt,
    question: initQuestion,
    beforeRoundEvents: firstBeforeEvents,
    roundEndsAt,
    timeMultiplier,
  } = location.state || {};

  // Navigate
  const navigate = useNavigate();

  // Connection status
  const { connectionStatus } = usePlayer();

  // Hooks
  // Player List
  const { playerList, setPlayerList } = usePlayerList(players);
  // Countdown Timer
  const { timeLeft, timerFinished, setTimerFinished, setTimerEndsAt } =
    useCountdownTimer(initEndsAt);
  // Round Timer
  const {
    roundTimeLeft,
    currentRound,
    setCurrentRound,
    setRoundEndsAt,
    setTimeMultiplier,
  } = useRoundTimer(roundEndsAt, timeMultiplier);
  // Code Submission
  const {
    handleCodeChange,
    isSubmitted,
    setIsSubmitted,
    isJudging,
    setIsJudging,
    language,
    handleSubmit,
    handleLanguageChange,
    testCasesResults,
  } = useCodeSubmission(code);
  // Question
  const { question, setQuestion, starterCode, setStarterCode } =
    useGameQuestion(initQuestion);
  // Editor Ready
  const { editorReady, setEditorReady } = useCodeEditor();
  // Round events
  const { beforeRoundEvents, setBeforeRoundEvents, afterRoundEvents } =
    useRoundEvents(firstBeforeEvents);
  // Results
  const {
    results,
    setResults,
    resultsReady,
    setResultsReady,
    eliminatedPlayers,
    setEliminatedPlayers,
    setMissedPlayer,
    missedPlayer,
    winner,
    setWinner,
  } = useResults(code);

  // Refs
  const roomDeletedRef = useRef(false);

  // Hooks with no state
  usePlayerLeave(socket, code, setPlayerList, roomDeletedRef);
  useReconnection(code, setPlayerList, {
    setCurrentRound,
    setBeforeRoundEvents,
    setQuestion,
    setStarterCode,
    setIsSubmitted,
    setIsJudging,
    setTimerEndsAt,
    setTimerFinished,
    setRoundEndsAt,
    setTimeMultiplier,
    setResults,
    setResultsReady,
    setEliminatedPlayers,
    setMissedPlayer,
    setWinner,
  });
  useDisconnection(code, roomDeletedRef);

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

  // State check
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, []);
  if (!location.state) return null;

  // Vars
  const isReconnecting = connectionStatus === "reconnecting";

  // Render
  return (
    <>
      {isReconnecting && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full bg-yellow-500/90 px-3 py-1 text-xs font-bold text-black shadow-lg">
          <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
          RECONNECTING...
        </div>
      )}

      {/* Always render editor, just hide it */}
      <div
        className={
          timerFinished && editorReady
            ? "flex flex-col h-screen relative"
            : "hidden"
        }
      >
        <GameNavbar
          isSubmitted={isSubmitted}
          isJudging={isJudging}
          onSubmit={handleSubmit}
          playerList={playerList}
          roundTimeLeft={roundTimeLeft}
          isReconnecting={isReconnecting}
        />
        <div className="flex flex-1 overflow-hidden bg-gray-950">
          <Question question={question} />
          <div className="w-0.5 bg-white"></div>
          <CodeEditor
            onChange={handleCodeChange}
            isJudging={isJudging}
            isSubmitted={isSubmitted}
            language={language}
            onLanguageChange={handleLanguageChange}
            onMount={() => setEditorReady(true)}
            starterCode={starterCode}
            testCasesResults={testCasesResults}
          />
        </div>

        {/* Show Results if ready */}
        {resultsReady && (
          <Results
            results={results}
            missedPlayer={missedPlayer}
            eliminatedPlayers={eliminatedPlayers}
            winner={winner}
            afterRoundEvents={afterRoundEvents}
          />
        )}
      </div>

      {/* Show timer until ready */}
      {(!timerFinished || !editorReady) && (
        <Timer
          timeLeft={timeLeft}
          currentRound={currentRound}
          beforeRoundEvents={beforeRoundEvents}
        />
      )}
    </>
  );
};

export default Game;
