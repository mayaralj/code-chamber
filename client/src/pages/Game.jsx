// Import from react
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
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
import { usePlayerList } from "../hooks/gameHooks/usePlayerList";
// Player
import usePlayer from "../hooks/usePlayer";
// toast
import toast from "react-hot-toast";

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
  // conncetion status
  const { connectionStatus } = usePlayer();
  // Local status
  const isReconnecting = connectionStatus === "reconnecting";

  // Player list state
  const { playerList, setPlayerList } = usePlayerList(players);
  // Countdown Timer
  const { timeLeft, timerFinished } = useCountdownTimer(initEndsAt);
  // Round Timer
  const { roundTimeLeft, currentRound } = useRoundTimer();
  // Code Submission
  const {
    handleCodeChange,
    isSubmitted,
    isJudging,
    language,
    handleSubmit,
    handleLanguageChange,
    submitError,
  } = useCodeSubmission(code, isReconnecting);
  // Question
  const { question, starterCode } = useGameQuestion(initQuestion);
  // Editor Ready
  const { editorReady, setEditorReady } = useCodeEditor();
  // Round events
  const { beforeRoundEvents, afterRoundEvents } =
    useRoundEvents(firstBeforeEvents);
  // Results
  const { results, resultsReady, eliminatedPlayers, missedPlayer, winner } =
    useResults(code);

  const toastIdRef = useRef(null);

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

  // Handle leaving game on page unload
  useEffect(() => {
    const handleUnload = () => {
      console.log("Page unload, leaving game room");
      socket.emit("game-leave-room", { code });
    };

    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, [code]);

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

  // Reconnection sockets
  useEffect(() => {
    // Handle reconnect success and failure
    socket.once("reconnect-success", ({ players }) => {
      console.log("Reconnected to game successfully");
      setPlayerList(players);
    });
    socket.once("reconnect-failure", () => {
      console.log("Failed to reconnect to game, redirecting to home");
      navigate("/browse", { replace: true });
    });

    // On connection, attempt to reconnect to game
    socket.on("connect", () => {
      console.log("Socket reconnected, attempting to reconnect to game");
      socket.emit("reconnect-game", { code });
    });

    // On waiting-for-reconnect, show toast notification
    socket.on("waiting-for-reconnect", () => {
      console.log("Waiting for server to reconnect you to game");
      toastIdRef.current = toast.error(
        "Waiting for players to reconnect before proceeding...",
        {
          duration: 1000000,
        },
      );
    });

    // Players reconnected
    socket.on("players-reconnected", ({ players }) => {
      console.log("Players reconnected to game successfully");
      setPlayerList(players);
      toast.dismiss(toastIdRef.current);
    });

    // Cleanup
    return () => {
      socket.off("reconnect-success");
      socket.off("reconnect-failure");
      socket.off("waiting-for-reconnect");
      socket.off("players-reconnected");
    };
  }, []);

  // Disconnection
  useEffect(() => {
    return () => {
      if (roomDeletedRef.current) {
        return;
      }
      console.log("Game component unmounting, leaving room with code:", code);
      socket.emit("game-leave-room", { code });
    };
  }, [code]);

  // State check
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, []);
  if (!location.state) return null;

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
