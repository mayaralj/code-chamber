import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import PublicRooms from "./pages/PublicRooms";
import RoomWait from "./pages/RoomWait";
import Join from "./pages/Join";
import Game from "./pages/Game";
import MainLayout from "./layouts/MainLayout";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/join" element={<Join />} />
        <Route path="/rooms" element={<PublicRooms />} />
        <Route path="/room-wait/:code" element={<RoomWait />} />
        <Route path="/game/:code" element={<Game />} />
      </Route>
    </Routes>
  );
};

export default App;
