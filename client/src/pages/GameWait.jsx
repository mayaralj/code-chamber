import { useParams, useNavigate } from "react-router-dom";

const GameWait = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const players = [
    { id: 1, username: "Player1" },
    { id: 2, username: "Player2" },
    { id: 3, username: "Player3" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold mb-3 -mt-16">Waiting for Game</h1>
      <p className="text-lg">Lobby Code: {code}</p>
      <div className="flex flex-col gap-4">
        {players.map((player) => (
          <div key={player.id} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-xl font-bold">{player.username}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameWait;
