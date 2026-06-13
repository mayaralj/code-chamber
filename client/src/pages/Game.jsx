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
    socket.emit("submit-code", { code, codeInput });
  };

  return (
    <>
      {/* Display Navbar */}
      {timerFinished && <GameNavbar onSubmit={handleSubmit} />}
      {/* Split the screen into 2 sections left and right one for question and */}
      {/* one for code editor */}
      {timerFinished ? (
        <div className="h-screen flex flex-row w-full bg-gray-950 overflow-hidden">
          {/* Left Section for Question */}
          <Question question={question} />
          {/* Display a white line splitting them */}
          <div className="w-0.5 bg-white"></div>
          {/* Right Section for Code Editor */}
          <CodeEditor onChange={setCodeInput} />
        </div>
      ) : (
        <Timer timeLeft={timeLeft} />
      )}
    </>
  );
};

export default Game;
