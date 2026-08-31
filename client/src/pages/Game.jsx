// Imports
import { useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
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
import useResizableSplit from "../hooks/gameHooks/useResizableSplit";
import Eliminated from "../components/GameComponents/Eliminated";
import Missed from "../components/GameComponents/Missed";
import toast from "react-hot-toast";

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
    codeStatus,
    setCodeStatus,
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
    isMissed,
    setIsMissed,
    winner,
    setWinner,
  } = useResults(code);

  // Refs
  const roomDeletedRef = useRef(false);

  // More states that need refs
  const { isEliminated } = usePlayerLeave(
    code,
    setPlayerList,
    roomDeletedRef,
    timerFinished,
  );

  // Resizable split between the question panel and the code editor panel
  const {
    containerRef: splitRef,
    size: questionWidth,
    handleDragStart,
  } = useResizableSplit({
    axis: "horizontal",
    initialSize: 38,
    minSize: 25,
    maxSize: 62,
  });

  // Hooks with no state
  useReconnection(code, setPlayerList, {
    setCurrentRound,
    setBeforeRoundEvents,
    setQuestion,
    setStarterCode,
    setCodeStatus,
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
  //   socket.once("check-room-response", ({ message, valid }) => {
  //     if (!valid) {
  //       toast.error(message);
  //       console.log("User not valid for this room, redirecting to home");
  //       navigate("/", { replace: true });
  //     }
  //   });
  // }, []);

  // State check
  useEffect(() => {
    if (!location.state) {
      toast.error("Invalid game state");
      navigate("/browse", { replace: true });
    }
  }, []);

  if (!location.state) return null;

  // Vars
  const isReconnecting = connectionStatus === "reconnecting";

  // If eliminated, show eliminated screen
  if (isEliminated) {
    return <Eliminated />;
  }

  // If missed, show missed screen
  if (isMissed) {
    return <Missed setMissed={setIsMissed} />;
  }

  // Render
  return (
    <>
      {/* Always render editor, just hide it */}
      <div
        className={`${
          timerFinished && editorReady
            ? "flex flex-col h-screen relative"
            : "hidden"
        }`}
      >
        <GameNavbar
          codeStatus={codeStatus}
          onSubmit={handleSubmit}
          playerList={playerList}
          roundTimeLeft={roundTimeLeft}
          isReconnecting={isReconnecting}
        />
        <div ref={splitRef} className="flex flex-1 overflow-hidden bg-zinc-950">
          <div
            className="h-full overflow-hidden"
            style={{ width: `${questionWidth}%` }}
          >
            <Question question={question} />
          </div>

          {/* Drag handle between question and editor */}
          <div
            onMouseDown={handleDragStart}
            className="group flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-zinc-950 hover:bg-zinc-800"
          >
            <div className="h-10 w-0.5 rounded-full bg-zinc-800 group-hover:bg-[#dfbb96]/75" />
          </div>

          <div className="h-full min-w-0 flex-1">
            <CodeEditor
              onChange={handleCodeChange}
              codeStatus={codeStatus}
              language={language}
              onLanguageChange={handleLanguageChange}
              onMount={() => setEditorReady(true)}
              starterCode={starterCode}
              testCasesResults={testCasesResults}
            />
          </div>
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
      {(!timerFinished || !editorReady || !question) && (
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
