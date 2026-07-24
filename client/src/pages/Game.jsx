// Import from react
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
// Import socket
import { socket } from "../socket";
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
import { useCodeEditor } from "../hooks/gameHooks/useCodeEditor";
import { useRoundEvents } from "../hooks/gameHooks/useRoundEvents";

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
  } = location.state || {};
  const navigate = useNavigate();

  // Countdown Timer
  const { timeLeft, timerFinished } = useCountdownTimer(initEndsAt);
  // Round Timer
  const { roundTimeLeft, currentRound } = useRoundTimer();
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
    playerList,
    setPlayerList,
  } = useCodeSubmission(code, players);
  // Editor Ready
  const { editorReady, setEditorReady } = useCodeEditor();
  // Round events
  const { beforeRoundEvents, afterRoundEvents } =
    useRoundEvents(firstBeforeEvents);
  // Results
  const { results, resultsReady, eliminatedPlayers, missedPlayer, winner } =
    useResults(code);

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

  // Player left
  useEffect(() => {
    socket.on("player-left", ({ players }) => {
      console.log("Player left, updating players list");
      // Update players list
      setPlayerList(players);
    });

    // Cleanup
    return () => {
      socket.off("player-left");
    };
  }, []);

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

  // Room Deletion
  const roomDeletedRef = useRef(false);
  useEffect(() => {
    socket.once("room-deleted", () => {
      console.log("Room has been deleted, redirecting to home");
      roomDeletedRef.current = true;
      navigate("/", { replace: true });
    });

    return () => {
      socket.off("room-deleted");
    };
  }, []);

  // Disconnection
  useEffect(() => {
    return () => {
      if (roomDeletedRef.current) {
        return;
      }
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
          playerList={playerList}
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
