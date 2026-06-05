import { useParams, useNavigate } from "react-router-dom";

const LobbyWait = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const players = [
    { id: 1, username: "Player1" },
    { id: 2, username: "Player2" },
    { id: 3, username: "Player3" },
  ];

  return <div>Lobby Wait</div>;
};

export default LobbyWait;
