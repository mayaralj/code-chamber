import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import socket from "../socket";
// Import from components
import Question from "../components/Question";
import CodeEditor from "../components/CodeEditor";

const Game = () => {
  const { code } = useParams();
  console.log("Game component rendered with code:", code);
  const location = useLocation();
  const { username, players } = location.state || {};
  const navigate = useNavigate();

  // States
  const [timeLeft, setTimeLeft] = useState(5);
  const [timerFinished, setTimerFinished] = useState(false);
  console.log("Game component rendered with timeLeft:", timeLeft);

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

  // State check
  useEffect(() => {
    if (!location.state) {
      navigate("/", { replace: true });
    }
  }, []);
  if (!location.state) return null;

  return (
    <>
      {/* Show timer if timer isnt finished */}
      {!timerFinished && (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
          {!timerFinished && <h1 className="text-6xl font-bold">{timeLeft}</h1>}
        </div>
      )}

      {/* Split the screen into 2 sections left and right one for question and */}
      {/* one for code editor */}
      {timerFinished && (
        <div className="min-h-screen flex flex-row w-full bg-gray-950">
          {/* Left Section for Question */}
          <Question />
          {/* Display a white line splitting them */}
          <div className="w-0.5 bg-white"></div>
          {/* Right Section for Code Editor */}
          <CodeEditor />
        </div>
      )}
    </>
  );
};

export default Game;
