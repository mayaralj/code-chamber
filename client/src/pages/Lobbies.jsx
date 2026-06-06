import { useNavigate } from "react-router-dom";

const Lobbies = () => {
  const navigate = useNavigate();
  // Placeholder lobbies
  const lobbies = [
    {
      id: 1,
      lobbyName: "Lobby 1",
      host: "Player1",
      players: 3,
      maxPlayers: 4,
      code: "ABCD",
    },
    {
      id: 2,
      lobbyName: "Lobby 2",
      host: "Player2",
      players: 2,
      maxPlayers: 4,
      code: "EFGH",
    },
    {
      id: 3,
      lobbyName: "Lobby 3",
      host: "Player3",
      players: 1,
      maxPlayers: 4,
      code: "IJKL",
    },
    {
      id: 4,
      lobbyName: "Lobby 4",
      host: "Player4",
      players: 4,
      maxPlayers: 4,
      code: "MNOP",
    },
    {
      id: 5,
      lobbyName: "Lobby 5",
      host: "Player5",
      players: 2,
      maxPlayers: 4,
      code: "QRST",
    },
    {
      id: 6,
      lobbyName: "Lobby 6",
      host: "Player6",
      players: 1,
      maxPlayers: 4,
      code: "UVWX",
    },
    {
      id: 7,
      lobbyName: "Lobby 7",
      host: "Player7",
      players: 3,
      maxPlayers: 4,
      code: "YZAB",
    },
    {
      id: 8,
      lobbyName: "Lobby 8",
      host: "Player8",
      players: 2,
      maxPlayers: 4,
      code: "CDEF",
    },
    {
      id: 9,
      lobbyName: "Lobby 9",
      host: "Player9",
      players: 1,
      maxPlayers: 4,
      code: "GHIJ",
    },
    {
      id: 10,
      lobbyName: "Lobby 10",
      host: "Player10",
      players: 4,
      maxPlayers: 4,
      code: "KLMN",
    },
  ];

  // Display list of public lobbies with option to click and join
  return (
    // Container for lobbies
    <div className="min-h-screen bg-gray-950 text-white flex flex-col gap-8 p-32">
      {/* Title */}
      <h1 className="text-4xl self-center font-bold mb-3 -mt-16">
        Public Lobbies
      </h1>
      {/* Lobby List Container */}
      <div
        className="grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5
        gap-6"
      >
        {/* Display each lobby from data */}
        {lobbies.map((lobby) => (
          // Individual lobby container
          <div
            key={lobby.id}
            className="bg-gray-800 p-4 rounded-lg flex flex-col gap-2"
          >
            {/* Lobby Info */}
            <h2 className="text-xl font-bold">{lobby.lobbyName}</h2>
            <p>Host: {lobby.host}</p>
            <p>
              Players: {lobby.players}/{lobby.maxPlayers}
            </p>
            <button
              className="bg-orange-100 hover:bg-orange-200 text-gray-950 font-bold py-2 px-4 rounded cursor-pointer mt-2"
              onClick={() => navigate(`/game-wait/${lobby.id}`)}
            >
              Join Lobby
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lobbies;
