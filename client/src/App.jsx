import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateLobby from "./pages/CreateLobby";
import Lobbies from "./pages/Lobbies";
import GameWait from "./pages/GameWait";
import Join from "./pages/Join";
import Game from "./pages/Game";
import MainLayout from "./layouts/MainLayout";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateLobby />} />
        <Route path="/join" element={<Join />} />
        <Route path="/lobbies" element={<Lobbies />} />
        <Route path="/game-wait/:code" element={<GameWait />} />
        <Route path="/game/:code" element={<Game />} />
      </Route>
    </Routes>
  );
};

export default App;
