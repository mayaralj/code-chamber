import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateLobby from "./pages/CreateLobby";
import Lobbies from "./pages/Lobbies";
import LobbyWait from "./pages/LobbyWait";
import Game from "./pages/Game";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateLobby />} />
      <Route path="/lobbies" element={<Lobbies />} />
      <Route path="/lobby/:code" element={<LobbyWait />} />
      <Route path="/game/:code" element={<Game />} />
    </Routes>
  );
};

export default App;
