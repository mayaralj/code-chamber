import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import socket from "../socket";

const Game = () => {
  const location = useLocation();
  const { username, players } = location.state || {};
  const navigate = useNavigate();

  // States
  const [timeLeft, setTimeLeft] = useState(5); // Example game timer
  const [gameStarted, setGameStarted] = useState(false);
  console.log("Game component rendered with timeLeft:", timeLeft);

  // Listen for timer ticks and game start
  useEffect(() => {
    socket.on("timer-tick", ({ timeLeft }) => {
      console.log("Timer tick:", timeLeft);
      setTimeLeft(timeLeft);
    });

    socket.on("timer-finished", () => {
      setGameStarted(true);
    });

    // Cleanup
    return () => {
      socket.off("timer-tick");
      socket.off("timer-finished");
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
      {!gameStarted ? (
        <h1 className="text-6xl font-bold">{timeLeft}</h1>
      ) : (
        <h1 className="text-4xl font-bold">Game In Progress</h1>
      )}
    </div>
  );
};

export default Game;
