import { useNavigate } from "react-router-dom";

const Lobbies = () => {
  const navigate = useNavigate();
  const lobbies = [
    { id: 1, host: "Player1", players: 3, maxPlayers: 4, code: "ABCD" },
    { id: 2, host: "Player2", players: 2, maxPlayers: 4, code: "EFGH" },
    { id: 3, host: "Player3", players: 1, maxPlayers: 4, code: "IJKL" },
  ];
  return <div>Lobbies</div>;
};

export default Lobbies;
